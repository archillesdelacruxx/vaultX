import React, { useState } from "react";

import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { useAuth } from "@/providers/auth-provider";
import { dateToStr, formatDate, formatMoney } from "@/lib/money";
import { api, trpcClient } from "@/lib/trpc";
import { useThemeColors } from "@/lib/theme";

interface IncomeRow {
  id: number;
  title: string;
  amount: number;
  category: string | null;
  receivedOn: Date | null;
  notes: string | null;
}

type IncomeForm = {
  title: string;
  amount: string;
  category: string;
  receivedOn: string;
  notes: string;
};

const CATEGORIES = [
  "Salary",
  "Bonus",
  "Freelance",
  "Business",
  "Interest",
  "Gift",
  "Other",
];

const FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", placeholder: "Monthly salary", capitalize: true },
  { name: "amount", label: "Amount", type: "number" },
  { name: "category", label: "Category", type: "select", options: CATEGORIES, optional: true },
  { name: "receivedOn", label: "Date", type: "date", optional: true },
  { name: "notes", label: "Notes", type: "multiline", optional: true },
];

const EMPTY: IncomeForm = { title: "", amount: "", category: "", receivedOn: "", notes: "" };

export default function IncomeScreen() {
  const utils = api.useUtils();
  const { user } = useAuth();
  const colors = useThemeColors();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.income.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.income.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<IncomeRow, IncomeForm>
      title="Income"
      subtitle={`${data?.total ?? 0} recorded`}
      icon="trending-up"
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        title: item.title,
        amount: String(item.amount),
        category: item.category ?? "",
        receivedOn: dateToStr(item.receivedOn),
        notes: item.notes ?? "",
      })}
      rows={rows}
      isLoading={isLoading}
      isFetching={isFetching}
      canLoadMore={canLoadMore}
      onLoadMore={() => setPage((p) => (p < (data?.pages ?? 1) ? p + 1 : p))}
      onSearch={(v) => {
        setQ(v);
        setPage(1);
      }}
      onRefresh={() => refetch()}
      onAdd={async (form) => {
        await trpcClient.income.create.mutate({
          title: form.title,
          amount: parseFloat(form.amount || "0") || 0,
          category: form.category || null,
          receivedOn: form.receivedOn || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.income.update.mutate({
          id,
          title: form.title,
          amount: parseFloat(form.amount || "0") || 0,
          category: form.category || null,
          receivedOn: form.receivedOn || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.income.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.title,
        subtitle: [item.category, formatDate(item.receivedOn)].filter(Boolean).join(" · "),
        right: formatMoney(item.amount, user?.currency),
        accent: colors.success,
        icon: "trending-up",
      })}
    />
  );
}
