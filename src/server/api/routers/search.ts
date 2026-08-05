import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

type Row = { id: number; title: string; subtitle: string; link: string };

const map = <T extends { id: bigint }>(rows: T[], to: (r: T) => Omit<Row, "id">): Row[] =>
  rows.map((r) => ({ id: Number(r.id), ...to(r) }));

export const searchRouter = createTRPCRouter({
  all: protectedProcedure
    .input(z.object({ q: z.string().trim().min(1).max(190) }))
    .query(async ({ ctx, input }) => {
      const uid = ctx.session.user.id;
      const q = input.q;

      const contains = (_field: string) => ({ contains: q, mode: "insensitive" as const });

      const [
        passwords,
        notes,
        apiKeys,
        licenses,
        emergency,
        banking,
        documents,
        journal,
        expenses,
        income,
        subscriptions,
        savings,
        goals,
        tasks,
      ] = await Promise.all([
        db.passwords.findMany({
          where: { user_id: uid, OR: [{ title: contains("title") }, { username: contains("username") }, { url: contains("url") }, { notes: contains("notes") }] },
          take: 8,
        }),
        db.notes.findMany({
          where: { user_id: uid, OR: [{ title: contains("title") }, { content: contains("content") }] },
          take: 8,
        }),
        db.api_keys.findMany({
          where: { user_id: uid, OR: [{ name: contains("name") }, { provider: contains("provider") }] },
          take: 8,
        }),
        db.licenses.findMany({
          where: { user_id: uid, OR: [{ software: contains("software") }, { licensed_to: contains("licensed_to") }] },
          take: 8,
        }),
        db.emergency.findMany({
          where: { user_id: uid, OR: [{ name: contains("name") }, { category: contains("category") }, { address: contains("address") }] },
          take: 8,
        }),
        db.banking.findMany({
          where: { user_id: uid, OR: [{ bank_name: contains("bank_name") }, { account_holder: contains("account_holder") }, { branch: contains("branch") }] },
          take: 8,
        }),
        db.documents.findMany({
          where: { user_id: uid, OR: [{ name: contains("name") }, { description: contains("description") }] },
          take: 8,
        }),
        db.journal.findMany({
          where: { user_id: uid, OR: [{ title: contains("title") }, { body: contains("body") }] },
          take: 8,
        }),
        db.expenses.findMany({
          where: { user_id: uid, OR: [{ title: contains("title") }, { category: contains("category") }, { notes: contains("notes") }] },
          take: 8,
        }),
        db.income.findMany({
          where: { user_id: uid, OR: [{ title: contains("title") }, { category: contains("category") }, { notes: contains("notes") }] },
          take: 8,
        }),
        db.subscriptions.findMany({
          where: { user_id: uid, OR: [{ name: contains("name") }, { notes: contains("notes") }] },
          take: 8,
        }),
        db.savings.findMany({
          where: { user_id: uid, OR: [{ name: contains("name") }] },
          take: 8,
        }),
        db.goals.findMany({
          where: { user_id: uid, OR: [{ title: contains("title") }, { description: contains("description") }] },
          take: 8,
        }),
        db.tasks.findMany({
          where: { user_id: uid, OR: [{ title: contains("title") }, { description: contains("description") }] },
          take: 8,
        }),
      ]);

      return {
        q,
        passwords: map(passwords, (r) => ({ title: r.title, subtitle: r.username ?? "", link: `/vault/passwords#${Number(r.id)}` })),
        notes: map(notes, (r) => ({ title: r.title, subtitle: r.content.slice(0, 60), link: `/vault/notes#${Number(r.id)}` })),
        apiKeys: map(apiKeys, (r) => ({ title: r.name, subtitle: r.provider ?? "", link: `/vault/api-keys#${Number(r.id)}` })),
        licenses: map(licenses, (r) => ({ title: r.software, subtitle: r.licensed_to ?? "", link: `/vault/licenses#${Number(r.id)}` })),
        emergency: map(emergency, (r) => ({ title: r.name, subtitle: r.category ?? "", link: `/vault/emergency#${Number(r.id)}` })),
        banking: map(banking, (r) => ({ title: r.bank_name, subtitle: r.account_holder ?? r.account_type ?? "", link: `/finance/banking#${Number(r.id)}` })),
        documents: map(documents, (r) => ({ title: r.name, subtitle: r.description ?? "", link: `/productivity/documents#${Number(r.id)}` })),
        journal: map(journal, (r) => ({ title: r.title ?? "Untitled", subtitle: r.body.slice(0, 60), link: `/productivity/journal#${Number(r.id)}` })),
        expenses: map(expenses, (r) => ({ title: r.title, subtitle: r.category ?? "", link: `/finance/expenses#${Number(r.id)}` })),
        income: map(income, (r) => ({ title: r.title, subtitle: r.category ?? "", link: `/finance/income#${Number(r.id)}` })),
        subscriptions: map(subscriptions, (r) => ({ title: r.name, subtitle: r.billing_cycle, link: `/finance/subscriptions#${Number(r.id)}` })),
        savings: map(savings, (r) => ({ title: r.name, subtitle: r.status, link: `/finance/savings#${Number(r.id)}` })),
        goals: map(goals, (r) => ({ title: r.title, subtitle: r.status, link: `/productivity/goals#${Number(r.id)}` })),
        tasks: map(tasks, (r) => ({ title: r.title, subtitle: r.status, link: `/productivity/tasks#${Number(r.id)}` })),
      };
    }),
});
