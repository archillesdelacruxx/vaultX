import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

const STATUSES = ["active", "paused", "completed"] as const;

const upsertSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().min(1, "Title is required.").max(190),
  description: z.string().max(20000).optional().nullable(),
  targetAmount: z.number().min(0).default(0),
  savedAmount: z.number().min(0).default(0),
  deadline: z.string().optional().nullable(),
  status: z.enum(STATUSES).default("active"),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const goalsRouter = createTRPCRouter({
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const q = input.q?.trim().toLowerCase() ?? "";
    const page = input.page ?? 1;
    const per = 15;
    const where = {
      user_id: ctx.session.user.id,
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
    };

    const [total, rows] = await Promise.all([
      db.goals.count({ where }),
      db.goals.findMany({
        where,
        orderBy: [{ status: "asc" }, { deadline: "asc" }, { updated_at: "desc" }],
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        description: r.description,
        targetAmount: Number(r.target_amount),
        savedAmount: Number(r.saved_amount),
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
      const rec = await db.goals.create({
        data: {
          user_id: ctx.session.user.id,
          title: input.title,
          description: input.description ?? null,
          target_amount: input.targetAmount,
          saved_amount: input.savedAmount,
          deadline: input.deadline ? new Date(input.deadline) : null,
          status: input.status,
        },
      });
      await audit(Number(ctx.session.user.id), "goal.create", "goals", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.goals.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.goals.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description ?? null,
          target_amount: input.targetAmount,
          saved_amount: input.savedAmount,
          deadline: input.deadline ? new Date(input.deadline) : null,
          status: input.status,
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "goal.update", "goals", input.id);
      return { id: input.id };
    }),

  setStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(STATUSES) }))
    .mutation(async ({ ctx, input }) => {
      await db.goals.updateMany({
        where: { id: input.id, user_id: ctx.session.user.id },
        data: { status: input.status },
      });
      await audit(Number(ctx.session.user.id), "goal.status", "goals", input.id, {
        status: input.status,
      });
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.goals.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "goal.delete", "goals", input.id);
      }
      return { ok: true };
    }),
});
