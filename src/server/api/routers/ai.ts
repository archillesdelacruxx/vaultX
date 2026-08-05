import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Shopping",
  "Bills",
  "Subscriptions",
  "Travel",
  "Personal",
  "Other",
];

async function chat(system: string, user: string) {
  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    system,
    prompt: user,
  });
  return text;
}

export const aiRouter = createTRPCRouter({
  reportInsights: protectedProcedure
    .input(z.object({ months: z.number().int().min(1).max(24).default(6) }))
    .query(async ({ ctx, input }) => {
      const uid = ctx.session.user.id;
      const start = new Date();
      start.setMonth(start.getMonth() - (input.months - 1));
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const [expenses, income, savings, goals, subs, cashflow] =
        await Promise.all([
          db.expenses.findMany({
            where: { user_id: uid, paid_on: { gte: start } },
            orderBy: { paid_on: "desc" },
            take: 200,
          }),
          db.income.findMany({
            where: { user_id: uid, received_on: { gte: start } },
            orderBy: { received_on: "desc" },
            take: 200,
          }),
          db.savings.findMany({
            where: { user_id: uid },
            orderBy: { updated_at: "desc" },
            take: 20,
          }),
          db.goals.findMany({
            where: { user_id: uid },
            orderBy: { updated_at: "desc" },
            take: 20,
          }),
          db.subscriptions.findMany({
            where: { user_id: uid },
            orderBy: { next_billing: "asc" },
            take: 20,
          }),
          db.$queryRaw<Array<{ month: Date; income: number; expenses: number }>>`
            SELECT date_trunc('month', m)::date AS month,
              COALESCE(SUM(i.amount), 0) AS income,
              COALESCE(SUM(e.amount), 0) AS expenses
            FROM generate_series(
              date_trunc('month', ${start}),
              date_trunc('month', CURRENT_DATE),
              INTERVAL '1 month'
            ) AS m
            LEFT JOIN income i  ON date_trunc('month', i.received_on) = m AND i.user_id = ${uid}
            LEFT JOIN expenses e ON date_trunc('month', e.paid_on) = m AND e.user_id = ${uid}
            GROUP BY m ORDER BY m`,
        ]);

      const byMonth = cashflow.map((r) => ({
        month: r.month.toISOString().slice(0, 7),
        income: Number(r.income),
        expenses: Number(r.expenses),
      }));

      const expenseByCategory = new Map<string, number>();
      for (const e of expenses) {
        const cat = e.category ?? "Other";
        expenseByCategory.set(cat, (expenseByCategory.get(cat) ?? 0) + Number(e.amount));
      }
      const topExpenseCategories = [...expenseByCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([category, total]) => `${category}: ${total.toFixed(2)}`);

      const totalExpense = expenses.reduce((a, e) => a + Number(e.amount), 0);
      const totalIncome = income.reduce((a, i) => a + Number(i.amount), 0);
      const subMonthly = subs
        .filter((s) => s.billing_cycle === "monthly")
        .reduce((a, s) => a + Number(s.amount), 0);
      const savingsTotal = savings
        .filter((s) => s.status === "active")
        .reduce((a, s) => a + Number(s.current_amount), 0);
      const goalSaved = goals
        .filter((g) => g.status === "active")
        .reduce((a, g) => a + Number(g.saved_amount), 0);
      const goalTarget = goals
        .filter((g) => g.status === "active")
        .reduce((a, g) => a + Number(g.target_amount), 0);

      const data = [
        `Period: last ${input.months} month(s).`,
        `Cashflow by month (YYYY-MM): ${byMonth
          .map((m) => `${m.month} in=${m.income.toFixed(2)} out=${m.expenses.toFixed(2)}`)
          .join(" | ")}`,
        `Total expenses: ${totalExpense.toFixed(2)}. Total income: ${totalIncome.toFixed(2)}.`,
        `Top expense categories: ${topExpenseCategories.join(", ")}`,
        `Savings (active): ${savingsTotal.toFixed(2)} across ${savings.filter((s) => s.status === "active").length} account(s).`,
        `Goals (active): saved ${goalSaved.toFixed(2)} of target ${goalTarget.toFixed(2)} across ${goals.filter((g) => g.status === "active").length} goal(s).`,
        `Monthly subscriptions: ${subMonthly.toFixed(2)} across ${subs.filter((s) => s.billing_cycle === "monthly").length} (${subs.length} total subscriptions).`,
      ]
        .filter(Boolean)
        .join("\n");

      const system =
        "You are VaultX AI, a financial insights analyst. " +
        "Give the user a concise, friendly financial report with: a summary of overall spending vs income, " +
        "notable trends month over month, top spending areas, savings and goal progress, and 2-3 practical suggestions to improve. " +
        "Use short bullet points. Respond in the same language the user writes in. Do not invent numbers that are not in the data.";

      return { insights: await chat(system, data) };
    }),

  journalSummary: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const uid = ctx.session.user.id;
      const start = new Date();
      start.setDate(start.getDate() - input.days);

      const entries = await db.journal.findMany({
        where: { user_id: uid, entry_date: { gte: start } },
        orderBy: { entry_date: "desc" },
        take: 50,
      });

      if (entries.length === 0) {
        return {
          summary:
            "Walang journal entries sa panahong ito. Kapag may entries ka na, makakabuo ako ng buod nito.",
        };
      }

      const data = entries
        .map(
          (j) =>
            `[${j.entry_date.toISOString().slice(0, 10)}]${j.mood ? ` mood=${j.mood}` : ""} ${j.title ?? "(untitled)"}:\n${j.body.slice(0, 400)}`,
        )
        .join("\n\n---\n\n");

      const system =
        "You are VaultX AI, a reflective writing assistant. " +
        "Summarize the user's journal entries from the given period: themes and emotions, notable highs and lows, " +
        "and any recurring patterns or progress. Be warm, concise, and encouraging. Use short paragraphs or bullets. " +
        "Respond in the same language the user writes in.";

      return { summary: await chat(system, data) };
    }),

  suggestCategory: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(190),
        amount: z.number().nonnegative(),
        kind: z.enum(["expense", "income"]),
      }),
    )
    .query(async ({ input }) => {
      const system =
        `You are a categorization assistant for a personal finance app. ` +
        `Given a transaction, respond with ONLY a single category name from this exact list: ${CATEGORIES.join(", ")}. ` +
        `Choose the best match. No explanation, no punctuation besides the category name.`;
      const prompt = `Kind: ${input.kind}. Title: "${input.title}". Amount: ${input.amount.toFixed(2)}. Category:`;

      const raw = (await chat(system, prompt)).trim().replace(/^["']|["']$/g, "");
      const normalized = CATEGORIES.find(
        (c) => c.toLowerCase() === raw.toLowerCase(),
      );
      return { category: normalized ?? "Other" };
    }),
});
