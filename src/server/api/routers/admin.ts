import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

const isAdmin = (ctx: { session: { user: { role: string } } }) => {
  if (ctx.session.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
};

export const adminRouter = createTRPCRouter({
  auditLogs: protectedProcedure
    .input(
      z.object({
        q: z.string().max(190).optional(),
        page: z.number().int().min(1).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      isAdmin(ctx);
      const q = input.q?.trim().toLowerCase() ?? "";
      const page = input.page ?? 1;
      const per = 25;
      const where = q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" as const } },
              { entity_type: { contains: q, mode: "insensitive" as const } },
              { ip: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [total, rows] = await Promise.all([
        db.audit_logs.count({ where }),
        db.audit_logs.findMany({
          where,
          orderBy: { created_at: "desc" },
          skip: (page - 1) * per,
          take: per,
          include: { users: { select: { email: true } } },
        }),
      ]);

      return {
        rows: rows.map((r) => ({
          id: Number(r.id),
          userId: r.user_id ? Number(r.user_id) : null,
          email: r.users?.email ?? null,
          action: r.action,
          entityType: r.entity_type,
          entityId: r.entity_id ? Number(r.entity_id) : null,
          details: r.details,
          ip: r.ip,
          userAgent: r.user_agent,
          created_at: r.created_at,
        })),
        total,
        pages: Math.max(1, Math.ceil(total / per)),
        page,
      };
    }),

  backup: protectedProcedure.query(async ({ ctx }) => {
    isAdmin(ctx);
    const [users, passwords, notes, apiKeys, licenses, emergency, banking, expenses, income, savings, subscriptions, goals, tasks, journal, documents, notifications, auditLogs] =
      await Promise.all([
        db.users.findMany(),
        db.passwords.findMany(),
        db.notes.findMany(),
        db.api_keys.findMany(),
        db.licenses.findMany(),
        db.emergency.findMany(),
        db.banking.findMany(),
        db.expenses.findMany(),
        db.income.findMany(),
        db.savings.findMany(),
        db.subscriptions.findMany(),
        db.goals.findMany(),
        db.tasks.findMany(),
        db.journal.findMany(),
        db.documents.findMany(),
        db.notifications.findMany(),
        db.audit_logs.findMany(),
      ]);
    return {
      generatedAt: new Date().toISOString(),
      users,
      passwords,
      notes,
      apiKeys,
      licenses,
      emergency,
      banking,
      expenses,
      income,
      savings,
      subscriptions,
      goals,
      tasks,
      journal,
      documents,
      notifications,
      auditLogs,
    };
  }),
});
