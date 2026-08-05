import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const dashboardRouter = createTRPCRouter({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const uid = ctx.session.user.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      passwordCount,
      noteCount,
      apiKeyCount,
      licenseCount,
      bankingCount,
      documentCount,
      expenseThisMonth,
      incomeThisMonth,
      expenseTotal,
      incomeTotal,
      taskCounts,
      upcomingSubs,
      recentNotes,
      recentTasks,
      cashflow,
      categoryBreakdown,
      goalSummary,
      savingsSummary,
    ] = await Promise.all([
      db.passwords.count({ where: { user_id: uid } }),
      db.notes.count({ where: { user_id: uid } }),
      db.api_keys.count({ where: { user_id: uid } }),
      db.licenses.count({ where: { user_id: uid } }),
      db.banking.count({ where: { user_id: uid } }),
      db.documents.count({ where: { user_id: uid } }),
      db.expenses.aggregate({
        where: { user_id: uid, paid_on: { gte: monthStart, lt: nextMonth } },
        _sum: { amount: true },
      }),
      db.income.aggregate({
        where: { user_id: uid, received_on: { gte: monthStart, lt: nextMonth } },
        _sum: { amount: true },
      }),
      db.expenses.aggregate({ where: { user_id: uid }, _sum: { amount: true } }),
      db.income.aggregate({ where: { user_id: uid }, _sum: { amount: true } }),
      db.tasks.groupBy({
        by: ["status"],
        where: { user_id: uid },
        _count: { _all: true },
      }),
      db.subscriptions.findMany({
        where: {
          user_id: uid,
          next_billing: { not: null, gte: now },
        },
        orderBy: { next_billing: "asc" },
        take: 5,
      }),
      db.notes.findMany({
        where: { user_id: uid },
        orderBy: [{ pinned: "desc" }, { updated_at: "desc" }],
        take: 5,
      }),
      db.tasks.findMany({
        where: { user_id: uid, status: { not: "done" } },
        orderBy: [{ due_date: "asc" }, { created_at: "desc" }],
        take: 5,
      }),
      db.$queryRaw<
        Array<{ month: Date; income: number; expenses: number }>
      >`
        SELECT date_trunc('month', m)::date AS month,
          COALESCE(SUM(i.amount), 0) AS income,
          COALESCE(SUM(e.amount), 0) AS expenses
        FROM generate_series(
          date_trunc('month', CURRENT_DATE - INTERVAL '6 months'),
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) AS m
        LEFT JOIN income i  ON date_trunc('month', i.received_on) = m AND i.user_id = ${uid}
        LEFT JOIN expenses e ON date_trunc('month', e.paid_on) = m AND e.user_id = ${uid}
        GROUP BY m ORDER BY m`,
      db.$queryRaw<
        Array<{ category: string; total: number }>
      >`
        SELECT COALESCE(category, 'Other') AS category, SUM(amount)::float AS total
        FROM expenses
        WHERE user_id = ${uid} AND paid_on >= ${monthStart} AND paid_on < ${nextMonth}
        GROUP BY category ORDER BY total DESC`,
      db.goals.aggregate({
        where: { user_id: uid, status: "active" },
        _sum: { target_amount: true, saved_amount: true },
      }),
      db.savings.aggregate({
        where: { user_id: uid, status: "active" },
        _sum: { current_amount: true },
      }),
    ]);

    const taskCount = Object.fromEntries(taskCounts.map((t) => [t.status, t._count._all]));

    return {
      stats: {
        passwords: passwordCount,
        notes: noteCount,
        apiKeys: apiKeyCount,
        licenses: licenseCount,
        banking: bankingCount,
        documents: documentCount,
      },
      finance: {
        expenseThisMonth: Number(expenseThisMonth._sum.amount ?? 0),
        incomeThisMonth: Number(incomeThisMonth._sum.amount ?? 0),
        expenseTotal: Number(expenseTotal._sum.amount ?? 0),
        incomeTotal: Number(incomeTotal._sum.amount ?? 0),
        saved: Number(savingsSummary._sum.current_amount ?? 0),
        goalTarget: Number(goalSummary._sum.target_amount ?? 0),
        goalSaved: Number(goalSummary._sum.saved_amount ?? 0),
      },
      tasks: {
        pending: taskCount.pending ?? 0,
        inProgress: taskCount.in_progress ?? 0,
        done: taskCount.done ?? 0,
      },
      upcomingSubs: upcomingSubs.map((s) => ({
        id: Number(s.id),
        name: s.name,
        amount: Number(s.amount),
        nextBilling: s.next_billing,
      })),
      recentNotes: recentNotes.map((n) => ({
        id: Number(n.id),
        title: n.title,
        category: n.category,
        pinned: n.pinned,
        updatedAt: n.updated_at,
      })),
      recentTasks: recentTasks.map((t) => ({
        id: Number(t.id),
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
      })),
      cashflow: cashflow.map((r) => ({
        month: r.month,
        income: Number(r.income),
        expenses: Number(r.expenses),
      })),
      categoryBreakdown: categoryBreakdown.map((r) => ({
        category: r.category,
        total: r.total,
      })),
    };
  }),
});
