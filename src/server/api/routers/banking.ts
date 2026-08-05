import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";
import { decrypt, encrypt } from "~/server/lib/crypto";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  bankName: z.string().min(1, "Bank name is required.").max(190),
  accountType: z.string().max(60).optional().nullable(),
  accountNumber: z.string().max(60).optional().nullable(),
  cardNumber: z.string().max(30).optional().nullable(),
  cvv: z.string().max(10).optional().nullable(),
  expiry: z.string().max(7).optional().nullable(),
  pin: z.string().max(20).optional().nullable(),
  accountHolder: z.string().max(190).optional().nullable(),
  branch: z.string().max(190).optional().nullable(),
  notes: z.string().max(20000).optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const bankingRouter = createTRPCRouter({
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const q = input.q?.trim().toLowerCase() ?? "";
    const page = input.page ?? 1;
    const per = 15;
    const where = {
      user_id: ctx.session.user.id,
      ...(q
        ? {
            OR: [
              { bank_name: { contains: q, mode: "insensitive" as const } },
              { account_holder: { contains: q, mode: "insensitive" as const } },
              { branch: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.banking.count({ where }),
      db.banking.findMany({
        where,
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        bankName: r.bank_name,
        accountType: r.account_type,
        accountNumber: decrypt(r.account_number_enc),
        cardNumber: decrypt(r.card_number_enc),
        cvv: decrypt(r.cvv_enc),
        expiry: r.expiry,
        pin: decrypt(r.pin_enc),
        accountHolder: r.account_holder,
        branch: r.branch,
        notes: r.notes,
        updated_at: r.updated_at,
      })),
      total,
      pages: Math.max(1, Math.ceil(total / per)),
      page,
    };
  }),

  create: protectedProcedure
    .input(upsertSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const rec = await db.banking.create({
        data: {
          user_id: ctx.session.user.id,
          bank_name: input.bankName,
          account_type: input.accountType ?? null,
          account_number_enc: input.accountNumber ? encrypt(input.accountNumber) : null,
          card_number_enc: input.cardNumber ? encrypt(input.cardNumber) : null,
          cvv_enc: input.cvv ? encrypt(input.cvv) : null,
          expiry: input.expiry ?? null,
          pin_enc: input.pin ? encrypt(input.pin) : null,
          account_holder: input.accountHolder ?? null,
          branch: input.branch ?? null,
          notes: input.notes ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "banking.create", "banking", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.banking.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.banking.update({
        where: { id: input.id },
        data: {
          bank_name: input.bankName,
          account_type: input.accountType ?? null,
          account_number_enc: input.accountNumber ? encrypt(input.accountNumber) : null,
          card_number_enc: input.cardNumber ? encrypt(input.cardNumber) : null,
          cvv_enc: input.cvv ? encrypt(input.cvv) : null,
          expiry: input.expiry ?? null,
          pin_enc: input.pin ? encrypt(input.pin) : null,
          account_holder: input.accountHolder ?? null,
          branch: input.branch ?? null,
          notes: input.notes ?? null,
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "banking.update", "banking", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.banking.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "banking.delete", "banking", input.id);
      }
      return { ok: true };
    }),
});
