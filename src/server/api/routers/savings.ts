import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

const STATUSES = ["active", "paused", "completed"] as const;

const upsertSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required.").max(190),
  targetAmount: z.number().min(0).default(0),
  currentAmount: z.number().min(0).default(0),
  deadline: z.string().optional().nullable(),
  status: z.enum(STATUSES).default("active"),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const savingsRouter = createTRPCRouter({
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const q = input.q?.trim().toLowerCase() ?? "";
    const page = input.page ?? 1;
    const per = 15;
    const where = {
      user_id: ctx.session.user.id,
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    };

    const [total, rows] = await Promise.all([
      db.savings.count({ where }),
      db.savings.findMany({
        where,
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        targetAmount: Number(r.target_amount),
        currentAmount: Number(r.current_amount),
        deadline: r.deadline,
        status: r.status as (typeof STATUSES)[number],
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
      const rec = await db.savings.create({
        data: {
          user_id: ctx.session.user.id,
          name: input.name,
          target_amount: input.targetAmount,
          current_amount: input.currentAmount,
          deadline: input.deadline ? new Date(input.deadline) : null,
          status: input.status,
        },
      });
      await audit(Number(ctx.session.user.id), "saving.create", "savings", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.savings.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.savings.update({
        where: { id: input.id },
        data: {
          name: input.name,
          target_amount: input.targetAmount,
          current_amount: input.currentAmount,
          deadline: input.deadline ? new Date(input.deadline) : null,
          status: input.status,
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "saving.update", "savings", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.savings.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "saving.delete", "savings", input.id);
      }
      return { ok: true };
    }),
});
