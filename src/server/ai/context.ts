import { db } from "~/server/db";

export type AssistantContext = {
  currency: string;
  expenses: Array<{
    title: string;
    amount: number;
    category: string | null;
    paidOn: Date;
  }>;
  income: Array<{
    title: string;
    amount: number;
    category: string | null;
    receivedOn: Date;
  }>;
  savings: Array<{
    name: string;
    currentAmount: number;
    targetAmount: number;
    deadline: Date | null;
    status: string;
  }>;
  goals: Array<{
    title: string;
    savedAmount: number;
    targetAmount: number;
    deadline: Date | null;
    status: string;
  }>;
  tasks: Array<{
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
  }>;
  subscriptions: Array<{
    name: string;
    amount: number;
    billingCycle: string;
    nextBilling: Date | null;
    autoRenew: boolean;
  }>;
  journal: Array<{
    title: string | null;
    mood: string | null;
    entryDate: Date;
    preview: string;
  }>;
  notes: Array<{
    title: string;
    category: string | null;
    pinned: boolean;
  }>;
  counts: {
    passwords: number;
    notes: number;
    apiKeys: number;
    licenses: number;
    banking: number;
    documents: number;
    expenses: number;
    income: number;
    tasksOpen: number;
    tasksDone: number;
    goalsActive: number;
    savingsActive: number;
    subscriptions: number;
    journalEntries: number;
  };
};

export async function buildAssistantContext(
  userId: number,
  currency = "USD",
): Promise<AssistantContext> {
  const [expenses, income, savings, goals, tasks, subscriptions, journal, notes] =
    await Promise.all([
      db.expenses.findMany({
        where: { user_id: userId },
        orderBy: { paid_on: "desc" },
        take: 40,
      }),
      db.income.findMany({
        where: { user_id: userId },
        orderBy: { received_on: "desc" },
        take: 40,
      }),
      db.savings.findMany({
        where: { user_id: userId },
        orderBy: { updated_at: "desc" },
        take: 20,
      }),
      db.goals.findMany({
        where: { user_id: userId },
        orderBy: { updated_at: "desc" },
        take: 20,
      }),
      db.tasks.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 30,
      }),
      db.subscriptions.findMany({
        where: { user_id: userId },
        orderBy: { next_billing: "asc" },
        take: 20,
      }),
      db.journal.findMany({
        where: { user_id: userId },
        orderBy: { entry_date: "desc" },
        take: 20,
      }),
      db.notes.findMany({
        where: { user_id: userId },
        orderBy: [{ pinned: "desc" }, { updated_at: "desc" }],
        take: 15,
      }),
    ]);

  const [passwords, apiKeys, licenses, banking, documents, expensesCount, incomeCount, tasksOpen, tasksDone, goalsActive, savingsActive, subscriptionsCount, journalCount, notesCount] =
    await Promise.all([
      db.passwords.count({ where: { user_id: userId } }),
      db.api_keys.count({ where: { user_id: userId } }),
      db.licenses.count({ where: { user_id: userId } }),
      db.banking.count({ where: { user_id: userId } }),
      db.documents.count({ where: { user_id: userId } }),
      db.expenses.count({ where: { user_id: userId } }),
      db.income.count({ where: { user_id: userId } }),
      db.tasks.count({ where: { user_id: userId, status: { not: "done" } } }),
      db.tasks.count({ where: { user_id: userId, status: "done" } }),
      db.goals.count({ where: { user_id: userId, status: "active" } }),
      db.savings.count({ where: { user_id: userId, status: "active" } }),
      db.subscriptions.count({ where: { user_id: userId } }),
      db.journal.count({ where: { user_id: userId } }),
      db.notes.count({ where: { user_id: userId } }),
    ]);

  return {
    currency,
    expenses: expenses.map((e) => ({
      title: e.title,
      amount: Number(e.amount),
      category: e.category,
      paidOn: e.paid_on,
    })),
    income: income.map((i) => ({
      title: i.title,
      amount: Number(i.amount),
      category: i.category,
      receivedOn: i.received_on,
    })),
    savings: savings.map((s) => ({
      name: s.name,
      currentAmount: Number(s.current_amount),
      targetAmount: Number(s.target_amount),
      deadline: s.deadline,
      status: s.status,
    })),
    goals: goals.map((g) => ({
      title: g.title,
      savedAmount: Number(g.saved_amount),
      targetAmount: Number(g.target_amount),
      deadline: g.deadline,
      status: g.status,
    })),
    tasks: tasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
    })),
    subscriptions: subscriptions.map((s) => ({
      name: s.name,
      amount: Number(s.amount),
      billingCycle: s.billing_cycle,
      nextBilling: s.next_billing,
      autoRenew: s.auto_renew,
    })),
    journal: journal.map((j) => ({
      title: j.title,
      mood: j.mood,
      entryDate: j.entry_date,
      preview: j.body.slice(0, 160),
    })),
    notes: notes.map((n) => ({
      title: n.title,
      category: n.category,
      pinned: n.pinned,
    })),
    counts: {
      passwords,
      notes: notesCount,
      apiKeys,
      licenses,
      banking,
      documents,
      expenses: expensesCount,
      income: incomeCount,
      tasksOpen,
      tasksDone,
      goalsActive,
      savingsActive,
      subscriptions: subscriptionsCount,
      journalEntries: journalCount,
    },
  };
}

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

export function buildSystemPrompt(ctx: AssistantContext): string {
  const lines: string[] = [
    "You are VaultX AI, a friendly personal-assistant inside the VaultX app. " +
      "You help the user understand and manage their vault: finances, tasks, goals, journal, and stored items.",
    "You have read-only access to a summary of the user's NON-SECRET data, shown below.",
    "SECURITY RULES (never violate):",
    "- You CANNOT see passwords, card numbers, CVVs, PINs, API keys, license keys, or emergency contact phone numbers. They are encrypted and never sent to you.",
    "- Never ask the user to type, paste, or reveal those secrets to you.",
    "- If the user asks for a stored password, key, or card number, politely refuse and explain you cannot access secret data.",
    "- Do not invent or fabricate account numbers, balances, or other details that are not in the data below.",
    "STYLE RULES:",
    "- Be concise and helpful. Use short paragraphs and bullet points when useful.",
    "- Respond in the same language the user writes in (English or Tagalog/Taglish).",
    "- Only answer using the data provided below; if something is not there, say you don't have that information.",
    "",
    "USER DATA (non-secret summary):",
    "",
     `Vault overview: ${ctx.counts.passwords} passwords, ${ctx.counts.notes} notes, ${ctx.counts.apiKeys} API keys, ${ctx.counts.licenses} licenses, ${ctx.counts.banking} bank accounts, ${ctx.counts.documents} documents.`,
     `Currency in use: ${ctx.currency}. All monetary amounts are expressed in ${ctx.currency}.`,
    `Tasks: ${ctx.counts.tasksOpen} open, ${ctx.counts.tasksDone} done.`,
    `Goals: ${ctx.counts.goalsActive} active. Savings accounts: ${ctx.counts.savingsActive} active.`,
    `Subscriptions: ${ctx.counts.subscriptions}. Journal entries: ${ctx.counts.journalEntries}.`,
    `Expenses on file: ${ctx.counts.expenses}. Income entries on file: ${ctx.counts.income}.`,
    "",
  ];

  if (ctx.expenses.length > 0) {
    lines.push("RECENT EXPENSES (up to 40):");
    for (const e of ctx.expenses) {
      lines.push(`- ${fmt(e.paidOn)} | ${e.category ?? "uncategorized"} | ${e.title} | ${e.amount.toFixed(2)}`);
    }
    lines.push("");
  }

  if (ctx.income.length > 0) {
    lines.push("RECENT INCOME (up to 40):");
    for (const i of ctx.income) {
      lines.push(`- ${fmt(i.receivedOn)} | ${i.category ?? "uncategorized"} | ${i.title} | ${i.amount.toFixed(2)}`);
    }
    lines.push("");
  }

  if (ctx.savings.length > 0) {
    lines.push("SAVINGS ACCOUNTS:");
    for (const s of ctx.savings) {
      lines.push(`- ${s.name} (${s.status}): ${s.currentAmount.toFixed(2)} / target ${s.targetAmount.toFixed(2)}, deadline ${fmt(s.deadline)}`);
    }
    lines.push("");
  }

  if (ctx.goals.length > 0) {
    lines.push("GOALS:");
    for (const g of ctx.goals) {
      lines.push(`- ${g.title} (${g.status}): ${g.savedAmount.toFixed(2)} saved / ${g.targetAmount.toFixed(2)} target, deadline ${fmt(g.deadline)}`);
    }
    lines.push("");
  }

  if (ctx.tasks.length > 0) {
    lines.push("TASKS (up to 30):");
    for (const t of ctx.tasks) {
      lines.push(`- [${t.status}/${t.priority}] ${t.title} due ${fmt(t.dueDate)}`);
    }
    lines.push("");
  }

  if (ctx.subscriptions.length > 0) {
    lines.push("SUBSCRIPTIONS:");
    for (const s of ctx.subscriptions) {
      lines.push(`- ${s.name}: ${s.amount.toFixed(2)} (${s.billingCycle}), next billing ${fmt(s.nextBilling)}, auto-renew ${s.autoRenew ? "yes" : "no"}`);
    }
    lines.push("");
  }

  if (ctx.journal.length > 0) {
    lines.push("RECENT JOURNAL ENTRIES (title, mood, date, preview):");
    for (const j of ctx.journal) {
      lines.push(`- [${fmt(j.entryDate)}]${j.mood ? ` mood=${j.mood}` : ""} ${j.title ?? "(untitled)"}: "${j.preview}${j.preview.length >= 160 ? "…" : ""}"`);
    }
    lines.push("");
  }

  if (ctx.notes.length > 0) {
    lines.push("RECENT NOTES (titles only):");
    for (const n of ctx.notes) {
      lines.push(`- ${n.title}${n.category ? ` (${n.category})` : ""}${n.pinned ? " [pinned]" : ""}`);
    }
  }

  return lines.join("\n");
}
