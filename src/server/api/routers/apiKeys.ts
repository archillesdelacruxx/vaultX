import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";
import { decrypt, encrypt } from "~/server/lib/crypto";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required.").max(190),
  apiKey: z.string().min(1, "API key is required.").max(500),
  provider: z.string().max(100).optional().nullable(),
  scopes: z.string().max(190).optional().nullable(),
  notes: z.string().max(20000).optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const apiKeysRouter = createTRPCRouter({
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
              { provider: { contains: q, mode: "insensitive" as const } },
              { scopes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.api_keys.count({ where }),
      db.api_keys.findMany({
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
        apiKey: decrypt(r.api_key_enc),
        provider: r.provider,
        scopes: r.scopes,
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
      const rec = await db.api_keys.create({
        data: {
          user_id: ctx.session.user.id,
          name: input.name,
          api_key_enc: encrypt(input.apiKey),
          provider: input.provider ?? null,
          scopes: input.scopes ?? null,
          notes: input.notes ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "apikey.create", "api_keys", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.api_keys.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.api_keys.update({
        where: { id: input.id },
        data: {
          name: input.name,
          api_key_enc: encrypt(input.apiKey),
          provider: input.provider ?? null,
          scopes: input.scopes ?? null,
          notes: input.notes ?? null,
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "apikey.update", "api_keys", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.api_keys.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "apikey.delete", "api_keys", input.id);
      }
      return { ok: true };
    }),
});
