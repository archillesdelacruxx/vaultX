import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().min(1, "Title is required.").max(190),
  content: z.string().max(20000).default(""),
  category: z.string().max(60).optional().nullable(),
  pinned: z.boolean().default(false),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const notesRouter = createTRPCRouter({
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
              { content: { contains: q, mode: "insensitive" as const } },
              { category: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.notes.count({ where }),
      db.notes.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { updated_at: "desc" }],
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((n) => ({ ...n, id: Number(n.id) })),
      total,
      pages: Math.max(1, Math.ceil(total / per)),
      page,
    };
  }),

  create: protectedProcedure
    .input(upsertSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const note = await db.notes.create({
        data: {
          user_id: ctx.session.user.id,
          title: input.title,
          content: input.content,
          category: input.category ?? null,
          pinned: input.pinned,
        },
      });
      await audit(Number(ctx.session.user.id), "note.create", "notes", Number(note.id));
      return { id: Number(note.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.notes.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.notes.update({
        where: { id: input.id },
        data: {
          title: input.title,
          content: input.content,
          category: input.category ?? null,
          pinned: input.pinned,
        },
      });
      await audit(Number(ctx.session.user.id), "note.update", "notes", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.notes.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "note.delete", "notes", input.id);
      }
      return { ok: true };
    }),
});
