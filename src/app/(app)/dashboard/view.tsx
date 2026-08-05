"use client";

import Link from "next/link";
import {
  Banknote,
  FileKey2,
  FileText,
  FolderLock,
  LockKeyhole,
  PiggyBank,
  ReceiptText,
  Repeat,
  StickyNote,
  Target,
  Wallet,
} from "lucide-react";

import { CashflowChart, CategoryDonut, ProgressBar } from "~/components/charts";
import { Card, EmptyState, PageLoader, StatCard } from "~/components/ui/primitives";
import { fmtDate, money } from "~/server/lib/format";
import { api } from "~/trpc/react";

const taskBadge: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

export default function DashboardPage() {
  const { data, isLoading } = api.dashboard.overview.useQuery();

  if (isLoading || !data) return <PageLoader />;

  const monthlySpend = data.finance.expenseThisMonth;
  const monthlyIncome = data.finance.incomeThisMonth;
  const saved = data.finance.saved;
  const goalPct = data.finance.goalTarget > 0
    ? Math.round((data.finance.goalSaved / data.finance.goalTarget) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Passwords stored" value={String(data.stats.passwords)} icon={LockKeyhole} tone="brand" />
        <StatCard label="Notes saved" value={String(data.stats.notes)} icon={StickyNote} tone="violet" />
        <StatCard label="Documents" value={String(data.stats.documents)} icon={FolderLock} tone="green" />
        <StatCard label="Monthly spending" value={`$${money(monthlySpend)}`} icon={ReceiptText} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Cashflow"
          subtitle="Income vs expenses, last 7 months"
        >
          <CashflowChart data={data.cashflow} />
        </Card>
        <Card title="Spending by category" subtitle="This month">
          <CategoryDonut data={data.categoryBreakdown} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card
          title="Quick add"
          subtitle="Jump in and record something"
          bodyClassName="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          <QuickLink href="/vault/passwords" label="Password" icon={LockKeyhole} />
          <QuickLink href="/vault/notes" label="Note" icon={StickyNote} />
          <QuickLink href="/vault/api-keys" label="API key" icon={FileKey2} />
          <QuickLink href="/vault/licenses" label="License" icon={FileText} />
          <QuickLink href="/finance/banking" label="Bank" icon={Banknote} />
          <QuickLink href="/finance/expenses" label="Expense" icon={ReceiptText} />
          <QuickLink href="/finance/income" label="Income" icon={Wallet} />
          <QuickLink href="/finance/subscriptions" label="Subscription" icon={Repeat} />
          <QuickLink href="/productivity/goals" label="Goal" icon={Target} />
        </Card>

        <Card title="Upcoming subscriptions" subtitle="Renewals in the next days">
          {data.upcomingSubs.length === 0 ? (
            <EmptyState icon={Repeat} title="No upcoming renewals" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.upcomingSubs.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{s.name}</div>
                    <div className="text-xs text-slate-400">{fmtDate(s.nextBilling)}</div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">${money(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card
          title="Recent notes"
          actions={<Link href="/vault/notes" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>}
          bodyClassName="p-0"
        >
          {data.recentNotes.length === 0 ? (
            <EmptyState icon={StickyNote} title="No notes yet" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentNotes.map((n) => (
                <li key={n.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                    <StickyNote className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</div>
                    <div className="text-xs text-slate-400">{n.category ?? "Uncategorized"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Open tasks"
          actions={<Link href="/productivity/tasks" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>}
          bodyClassName="p-0"
        >
          {data.recentTasks.length === 0 ? (
            <EmptyState icon={Target} title="All caught up" description="No open tasks right now." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{t.title}</span>
                    <span className="text-xs text-slate-400">{t.dueDate ? fmtDate(t.dueDate) : "No due date"}</span>
                  </span>
                  <span className={`badge ${taskBadge[t.status] ?? taskBadge.pending}`}>{t.status.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Savings overview" subtitle="Your progress toward goals">
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Saved so far</span>
                <span className="font-semibold text-slate-900 dark:text-white">${money(saved)}</span>
              </div>
              <ProgressBar value={data.finance.goalSaved} max={data.finance.goalTarget} />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <PiggyBank className="h-3.5 w-3.5" />
                {goalPct}% of your active goal target
              </p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">This month</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {monthlyIncome >= monthlySpend ? "+" : ""}${money(monthlyIncome - monthlySpend)}
                </span>
              </div>
              <ProgressBar value={monthlySpend} max={Math.max(1, monthlyIncome)} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 text-center transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-800 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
    >
      <Icon className="h-5 w-5 text-brand-600" />
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
    </Link>
  );
}
