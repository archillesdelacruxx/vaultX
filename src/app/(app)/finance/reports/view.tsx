"use client";

import { Banknote, PiggyBank, ReceiptText, Repeat, Wallet } from "lucide-react";
import Link from "next/link";

import { CashflowChart, CategoryDonut } from "~/components/charts";
import { Card, EmptyState, PageLoader, StatCard } from "~/components/ui/primitives";
import { fmtDate, money } from "~/server/lib/format";
import { api } from "~/trpc/react";

export default function ReportsPage() {
  const { data, isLoading } = api.dashboard.overview.useQuery();

  if (isLoading || !data) return <PageLoader />;

  const monthlySpend = data.finance.expenseThisMonth;
  const monthlyIncome = data.finance.incomeThisMonth;
  const totalSpend = data.finance.expenseTotal;
  const totalIncome = data.finance.incomeTotal;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Income this month" value={`$${money(monthlyIncome)}`} icon={Wallet} tone="green" />
        <StatCard label="Spending this month" value={`$${money(monthlySpend)}`} icon={ReceiptText} tone="red" />
        <StatCard label="Total income" value={`$${money(totalIncome)}`} icon={Banknote} tone="violet" />
        <StatCard label="Total expenses" value={`$${money(totalSpend)}`} icon={PiggyBank} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Cashflow" subtitle="Income vs expenses, last 7 months">
          <CashflowChart data={data.cashflow} />
        </Card>
        <Card title="Spending by category" subtitle="This month">
          <CategoryDonut data={data.categoryBreakdown} />
        </Card>
      </div>

      <Card
        title="Upcoming renewals"
        subtitle="Subscriptions in the next days"
        actions={
          <Link href="/finance/subscriptions" className="text-xs font-medium text-brand-600 hover:underline">
            View all
          </Link>
        }
      >
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
  );
}
