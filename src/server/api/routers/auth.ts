import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";
import { TRPCError } from "@trpc/server";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase().trim();
      const exists = await db.users.findFirst({ where: { email } });
      if (exists) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with that email already exists." });
      }
      const user = await db.users.create({
        data: {
          name: input.name.trim(),
          email,
          password_hash: await bcrypt.hash(input.password, 10),
          role: "user",
        },
      });
      await audit(Number(user.id), "auth.register", "users", Number(user.id));
      await db.notifications.create({
        data: {
          user_id: user.id,
          title: "Welcome to VaultX",
          body: "Your secure vault is ready. Add your first password or note to get started.",
          type: "info",
        },
      });
      return { ok: true };
    }),

  forgotPassword: publicProcedure
    .input(forgotSchema)
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase().trim();
      const user = await db.users.findFirst({ where: { email } });
      if (!user) return { ok: true, resetUrl: null }; // never leak account existence

      const token = randomBytes(32).toString("hex");
      await db.password_resets.create({
        data: {
          user_id: user.id,
          token_hash: hashToken(token),
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const base = process.env.AUTH_URL ?? "http://localhost:3000";
      const resetUrl = `${base}/reset?token=${token}`;

      // NOTE: No mail server is configured. Return the link so it can be used
      // directly (self-hosted personal app). Swap in an SMTP provider here later.
      return { ok: true, resetUrl };
    }),

  resetPassword: publicProcedure
    .input(resetSchema)
    .mutation(async ({ input }) => {
      const reset = await db.password_resets.findFirst({
        where: {
          token_hash: hashToken(input.token),
          used: false,
          expires_at: { gt: new Date() },
        },
      });
      if (!reset) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link." });
      }
      const user = await db.users.findUnique({ where: { id: reset.user_id } });
      if (!user) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link." });
      }
      await db.users.update({
        where: { id: user.id },
        data: { password_hash: await bcrypt.hash(input.password, 10) },
      });
      await db.password_resets.update({ where: { id: reset.id }, data: { used: true } });
      await audit(Number(user.id), "auth.password_reset", "users", Number(user.id));
      return { ok: true };
    }),

  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await db.users.findUnique({ where: { id: ctx.session.user.id } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const ok = await bcrypt.compare(input.currentPassword, user.password_hash);
      if (!ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect." });
      }
      await db.users.update({
        where: { id: user.id },
        data: { password_hash: await bcrypt.hash(input.newPassword, 10) },
      });
      await audit(Number(user.id), "auth.password_change", "users", Number(user.id));
      return { ok: true };
    }),

  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await db.users.update({
        where: { id: ctx.session.user.id },
        data: { name: input.name.trim() },
      });
      await audit(Number(ctx.session.user.id), "auth.profile_update", "users", Number(ctx.session.user.id));
      return { ok: true };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.users.findUnique({
      where: { id: ctx.session.user.id },
      select: { id: true, name: true, email: true, role: true, created_at: true },
    });
    if (!user) throw new Error("User not found.");
    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    };
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await db.users.delete({ where: { id: ctx.session.user.id } });
    return { ok: true };
  }),

  hasScreenPin: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.users.findUnique({
      where: { id: ctx.session.user.id },
      select: { screen_pin_hash: true },
    });
    return { hasPin: Boolean(user?.screen_pin_hash) };
  }),

  setScreenPin: protectedProcedure
    .input(z.object({ pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits.") }))
    .mutation(async ({ ctx, input }) => {
      const pinHash = await bcrypt.hash(input.pin, 10);
      await db.users.update({
        where: { id: ctx.session.user.id },
        data: { screen_pin_hash: pinHash },
      });
      await audit(Number(ctx.session.user.id), "auth.set_screen_pin", "users", Number(ctx.session.user.id));
      return { ok: true };
    }),

  verifyScreenPin: protectedProcedure
    .input(z.object({ pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits.") }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.users.findUnique({
        where: { id: ctx.session.user.id },
        select: { screen_pin_hash: true },
      });
      if (!user?.screen_pin_hash) {
        return { valid: false, message: "No PIN set for this account." };
      }
      const valid = await bcrypt.compare(input.pin, user.screen_pin_hash);
      return { valid };
    }),
});
