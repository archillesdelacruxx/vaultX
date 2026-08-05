import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().min(1, "Title is required.").max(190),
  amount: z.number().min(0).default(0),
  category: z.string().max(60).optional().nullable(),
  receivedOn: z.string().optional().nullable(),
  notes: z.string().max(20000).optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const incomeRouter = createTRPCRouter({
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
              { category: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.income.count({ where }),
      db.income.findMany({
        where,
        orderBy: { received_on: "desc" },
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        amount: Number(r.amount),
        category: r.category,
        receivedOn: r.received_on,
        notes: r.notes,
      })),
      total,
      pages: Math.max(1, Math.ceil(total / per)),
      page,
    };
  }),

  create: protectedProcedure
    .input(upsertSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const rec = await db.income.create({
        data: {
          user_id: ctx.session.user.id,
          title: input.title,
          amount: input.amount,
          category: input.category ?? null,
          received_on: input.receivedOn ? new Date(input.receivedOn) : new Date(),
          notes: input.notes ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "income.create", "income", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.income.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.income.update({
        where: { id: input.id },
        data: {
          title: input.title,
          amount: input.amount,
          category: input.category ?? null,
          received_on: input.receivedOn ? new Date(input.receivedOn) : new Date(),
          notes: input.notes ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "income.update", "income", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.income.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "income.delete", "income", input.id);
      }
      return { ok: true };
    }),
});
