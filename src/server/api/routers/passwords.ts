import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";
import { decrypt, encrypt } from "~/server/lib/crypto";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().min(1, "Title is required.").max(190),
  username: z.string().max(190).optional().nullable(),
  password: z.string().max(500).optional().default(""),
  url: z.string().max(500).optional().nullable(),
  notes: z.string().max(20000).optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const passwordsRouter = createTRPCRouter({
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const q = input.q?.trim().toLowerCase() ?? "";
    const page = input.page ?? 1;
    const per = 15;
    const where = {
      user_id: ctx.session.user.id,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { username: { contains: q, mode: "insensitive" as const } },
              { url: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.passwords.count({ where }),
      db.passwords.findMany({
        where,
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((p) => ({
        id: Number(p.id),
        title: p.title,
        username: p.username,
        url: p.url,
        notes: p.notes,
        password: decrypt(p.password_enc),
        updated_at: p.updated_at,
      })),
      total,
      pages: Math.max(1, Math.ceil(total / per)),
      page,
    };
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const p = await db.passwords.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!p) throw new Error("Record not found.");
      return {
        id: Number(p.id),
        title: p.title,
        username: p.username,
        password: decrypt(p.password_enc),
        url: p.url,
        notes: p.notes,
      };
    }),

  create: protectedProcedure
    .input(upsertSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const rec = await db.passwords.create({
        data: {
          user_id: ctx.session.user.id,
          title: input.title,
          username: input.username ?? null,
          password_enc: input.password ? encrypt(input.password) : null,
          url: input.url ?? null,
          notes: input.notes ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "password.create", "passwords", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.passwords.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.passwords.update({
        where: { id: input.id },
        data: {
          title: input.title,
          username: input.username ?? null,
          password_enc: input.password ? encrypt(input.password) : exists.password_enc,
          url: input.url ?? null,
          notes: input.notes ?? null,
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "password.update", "passwords", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.passwords.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "password.delete", "passwords", input.id);
      }
      return { ok: true };
    }),
});
