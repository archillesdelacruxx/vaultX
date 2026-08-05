import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

const STATUSES = ["pending", "in_progress", "done"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

const upsertSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().min(1, "Title is required.").max(190),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(STATUSES).default("pending"),
  priority: z.enum(PRIORITIES).default("medium"),
  due_date: z.string().optional().nullable(),
  tags: z.string().max(190).optional().nullable(),
});

export const tasksRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        q: z.string().max(190).optional(),
        status: z.enum([...STATUSES, "all"]).optional(),
        page: z.number().int().min(1).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const q = input.q?.trim().toLowerCase() ?? "";
      const page = input.page ?? 1;
      const per = 15;
      const where = {
        user_id: ctx.session.user.id,
        ...(input.status && input.status !== "all"
          ? { status: input.status }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { tags: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        db.tasks.count({ where }),
        db.tasks.findMany({
          where,
          orderBy: [{ status: "asc" }, { due_date: "asc" }, { created_at: "desc" }],
          skip: (page - 1) * per,
          take: per,
        }),
      ]);
      return {
        rows: rows.map((t) => ({
          ...t,
          id: Number(t.id),
          status: t.status as (typeof STATUSES)[number],
          priority: t.priority as (typeof PRIORITIES)[number],
        })),
        total,
        pages: Math.max(1, Math.ceil(total / per)),
        page,
      };
    }),

  create: protectedProcedure
    .input(upsertSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.tasks.create({
        data: {
          user_id: ctx.session.user.id,
          title: input.title,
          description: input.description ?? null,
          status: input.status,
          priority: input.priority,
          due_date: input.due_date ? new Date(input.due_date) : null,
          tags: input.tags ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "task.create", "tasks", Number(task.id));
      return { id: Number(task.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.tasks.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.tasks.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description ?? null,
          status: input.status,
          priority: input.priority,
          due_date: input.due_date ? new Date(input.due_date) : null,
          tags: input.tags ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "task.update", "tasks", input.id);
      return { id: input.id };
    }),

  setStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(STATUSES) }))
    .mutation(async ({ ctx, input }) => {
      await db.tasks.updateMany({
        where: { id: input.id, user_id: ctx.session.user.id },
        data: { status: input.status },
      });
      await audit(Number(ctx.session.user.id), "task.status", "tasks", input.id, {
        status: input.status,
      });
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.tasks.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "task.delete", "tasks", input.id);
      }
      return { ok: true };
    }),
});
