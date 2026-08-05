import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";
import { decrypt, encrypt } from "~/server/lib/crypto";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  category: z.string().max(60).optional().nullable(),
  name: z.string().min(1, "Name is required.").max(190),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  notes: z.string().max(20000).optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const emergencyRouter = createTRPCRouter({
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
              { category: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.emergency.count({ where }),
      db.emergency.findMany({
        where,
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        category: r.category,
        name: r.name,
        phone: decrypt(r.phone_enc),
        address: r.address,
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
      const rec = await db.emergency.create({
        data: {
          user_id: ctx.session.user.id,
          category: input.category ?? null,
          name: input.name,
          phone_enc: input.phone ? encrypt(input.phone) : null,
          address: input.address ?? null,
          notes: input.notes ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "emergency.create", "emergency", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.emergency.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.emergency.update({
        where: { id: input.id },
        data: {
          category: input.category ?? null,
          name: input.name,
          phone_enc: input.phone ? encrypt(input.phone) : null,
          address: input.address ?? null,
          notes: input.notes ?? null,
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "emergency.update", "emergency", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.emergency.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "emergency.delete", "emergency", input.id);
      }
      return { ok: true };
    }),
});
