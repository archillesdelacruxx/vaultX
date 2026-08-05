import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required.").max(255),
  filePath: z.string().max(500).optional().nullable(),
  fileType: z.string().max(100).optional().nullable(),
  fileSize: z.number().int().min(0).default(0),
  description: z.string().max(20000).optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const documentsRouter = createTRPCRouter({
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const q = input.q?.trim().toLowerCase() ?? "";
    const page = input.page ?? 1;
    const per = 15;
    const where = {
      user_id: ctx.session.user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.documents.count({ where }),
      db.documents.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        filePath: r.file_path,
        fileType: r.file_type,
        fileSize: Number(r.file_size),
        description: r.description,
        created_at: r.created_at,
      })),
      total,
      pages: Math.max(1, Math.ceil(total / per)),
      page,
    };
  }),

  create: protectedProcedure
    .input(upsertSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const rec = await db.documents.create({
        data: {
          user_id: ctx.session.user.id,
          name: input.name,
          file_path: input.filePath ?? "",
          file_type: input.fileType ?? null,
          file_size: input.fileSize,
          description: input.description ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "document.create", "documents", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.documents.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.documents.update({
        where: { id: input.id },
        data: {
          name: input.name,
          file_path: input.filePath ?? "",
          file_type: input.fileType ?? null,
          file_size: input.fileSize,
          description: input.description ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "document.update", "documents", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.documents.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "document.delete", "documents", input.id);
      }
      return { ok: true };
    }),
});
