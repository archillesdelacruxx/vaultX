import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

const CYCLES = ["weekly", "monthly", "quarterly", "yearly"] as const;

const upsertSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1, "Name is required.").max(190),
  amount: z.number().min(0).default(0),
  billingCycle: z.enum(CYCLES).default("monthly"),
  nextBilling: z.string().optional().nullable(),
  autoRenew: z.boolean().default(true),
  notes: z.string().max(20000).optional().nullable(),
});

const listSchema = z.object({
  q: z.string().max(190).optional(),
  page: z.number().int().min(1).optional(),
});

export const subscriptionsRouter = createTRPCRouter({
  list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const q = input.q?.trim().toLowerCase() ?? "";
    const page = input.page ?? 1;
    const per = 15;
    const where = {
      user_id: ctx.session.user.id,
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    };

    const [total, rows] = await Promise.all([
      db.subscriptions.count({ where }),
      db.subscriptions.findMany({
        where,
        orderBy: [{ next_billing: "asc" }, { updated_at: "desc" }],
        skip: (page - 1) * per,
        take: per,
      }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        amount: Number(r.amount),
        billingCycle: r.billing_cycle as (typeof CYCLES)[number],
        nextBilling: r.next_billing,
        autoRenew: r.auto_renew,
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
      const rec = await db.subscriptions.create({
        data: {
          user_id: ctx.session.user.id,
          name: input.name,
          amount: input.amount,
          billing_cycle: input.billingCycle,
          next_billing: input.nextBilling ? new Date(input.nextBilling) : null,
          auto_renew: input.autoRenew,
          notes: input.notes ?? null,
        },
      });
      await audit(Number(ctx.session.user.id), "subscription.create", "subscriptions", Number(rec.id));
      return { id: Number(rec.id) };
    }),

  update: protectedProcedure
    .input(upsertSchema)
    .mutation(async ({ ctx, input }) => {
      const exists = await db.subscriptions.findFirst({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (!exists) throw new Error("Record not found.");
      await db.subscriptions.update({
        where: { id: input.id },
        data: {
          name: input.name,
          amount: input.amount,
          billing_cycle: input.billingCycle,
          next_billing: input.nextBilling ? new Date(input.nextBilling) : null,
          auto_renew: input.autoRenew,
          notes: input.notes ?? null,
          updated_at: new Date(),
        },
      });
      await audit(Number(ctx.session.user.id), "subscription.update", "subscriptions", input.id);
      return { id: input.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.subscriptions.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      if (deleted.count > 0) {
        await audit(Number(ctx.session.user.id), "subscription.delete", "subscriptions", input.id);
      }
      return { ok: true };
    }),
});
