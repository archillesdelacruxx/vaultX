import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";
import { decrypt, encrypt } from "~/server/lib/crypto";

const upsertSchema = z.object({
  id: z.number().int().optional(),
  software: z.string().min(1, "Software is required.").max(190),
  licenseKey: z.string().min(1, "License key is required.").max(500),
  licensedTo: z.string().max(190).optional().nullable(),
  expiry: z.string().optional().nullable(),
  notes: z.string().max(20000).optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const licensesRouter = createTRPCRouter({
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const q = input.q?.trim().toLowerCase() ?? "";
    const page = input.page ?? 1;
    const per = 15;
    const where = {
      user_id: ctx.session.user.id,
      ...(q
        ? {
            OR: [
              { software: { contains: q, mode: "insensitive" as const } },
              { licensed_to: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      db.licenses.count({ where }),
      db.licenses.findMany({
        where,
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        software: r.software,
        licenseKey: decrypt(r.license_key_enc),
        licensedTo: r.licensed_to,
        expiry: r.expiry,
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
      const rec = await db.licenses.create({
        data: {
          user_id: ctx.session.user.id,
          software: input.software,
          license_key_enc: encrypt(input.licenseKey),
          licensed_to: input.licensedTo ?? null,
          expiry: input.expiry ? new Date(input.expiry) : null,
          notes: input.notes ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "license.create", "licenses", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.licenses.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.licenses.update({
        where: { id: input.id },
        data: {
          software: input.software,
          license_key_enc: encrypt(input.licenseKey),
          licensed_to: input.licensedTo ?? null,
          expiry: input.expiry ? new Date(input.expiry) : null,
          notes: input.notes ?? null,
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "license.update", "licenses", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.licenses.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "license.delete", "licenses", input.id);
      }
      return { ok: true };
    }),
});
