import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().max(190).optional().nullable(),
  body: z.string().min(1, "Entry is required.").max(50000),
  mood: z.string().max(20).optional().nullable(),
  entryDate: z.string().optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const journalRouter = createTRPCRouter({
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
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.journal.count({ where }),
      db.journal.findMany({
        where,
        orderBy: { entry_date: "desc" },
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        body: r.body,
        mood: r.mood,
        entryDate: r.entry_date,
      })),
      total,
      pages: Math.max(1, Math.ceil(total / per)),
      page,
    };
  }),

  create: protectedProcedure
    .input(upsertSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const rec = await db.journal.create({
        data: {
          user_id: ctx.session.user.id,
          title: input.title ?? null,
          body: input.body,
          mood: input.mood ?? null,
          entry_date: input.entryDate ? new Date(input.entryDate) : new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "journal.create", "journal", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.journal.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.journal.update({
        where: { id: input.id },
        data: {
          title: input.title ?? null,
          body: input.body,
          mood: input.mood ?? null,
          entry_date: input.entryDate ? new Date(input.entryDate) : new Date(),
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "journal.update", "journal", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.journal.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "journal.delete", "journal", input.id);
      }
      return { ok: true };
    }),
});
