import React, { useState } from "react";

import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { useAuth } from "@/providers/auth-provider";
import { dateToStr, formatDate, formatMoney } from "@/lib/money";
import { api, trpcClient } from "@/lib/trpc";
import { useThemeColors } from "@/lib/theme";

interface SavingRow {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  status: string;
}

type SavingForm = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  status: string;
};

const FIELDS: FieldDef[] = [
  { name: "name", label: "Name", type: "text", placeholder: "Emergency fund", capitalize: true },
  { name: "targetAmount", label: "Target", type: "number" },
  { name: "currentAmount", label: "Current", type: "number" },
  { name: "deadline", label: "Deadline", type: "date", optional: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: ["active", "paused", "completed"],
  },
];

const EMPTY: SavingForm = { name: "", targetAmount: "", currentAmount: "", deadline: "", status: "active" };

export default function SavingsScreen() {
  const utils = api.useUtils();
  const { user } = useAuth();
  const colors = useThemeColors();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.savings.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.savings.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<SavingRow, SavingForm>
      title="Savings"
      subtitle={`${data?.total ?? 0} goals`}
      icon="cash"
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        name: item.name,
        targetAmount: String(item.targetAmount),
        currentAmount: String(item.currentAmount),
        deadline: dateToStr(item.deadline),
        status: item.status,
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
        await trpcClient.savings.create.mutate({
          name: form.name,
          targetAmount: parseFloat(form.targetAmount || "0") || 0,
          currentAmount: parseFloat(form.currentAmount || "0") || 0,
          deadline: form.deadline || null,
          status: form.status as "active" | "paused" | "completed",
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.savings.update.mutate({
          id,
          name: form.name,
          targetAmount: parseFloat(form.targetAmount || "0") || 0,
          currentAmount: parseFloat(form.currentAmount || "0") || 0,
          deadline: form.deadline || null,
          status: form.status as "active" | "paused" | "completed",
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.savings.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.name,
        subtitle: item.deadline ? formatDate(item.deadline) : undefined,
        right: `${formatMoney(item.currentAmount, user?.currency)} / ${formatMoney(item.targetAmount, user?.currency)}`,
        accent: item.status === "completed" ? colors.success : item.status === "paused" ? colors.textMuted : colors.text,
        icon: "cash",
      })}
    />
  );
}
