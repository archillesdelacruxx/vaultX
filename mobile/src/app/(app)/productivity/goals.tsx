import React, { useState } from "react";

import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen, type ActionChip } from "@/components/crud/module-screen";
import { useAuth } from "@/providers/auth-provider";
import { useThemeColors } from "@/lib/theme";
import { dateToStr, formatDate, formatMoney } from "@/lib/money";
import { api, trpcClient } from "@/lib/trpc";

interface GoalRow {
  id: number;
  title: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number;
  deadline: Date | null;
  status: "active" | "paused" | "completed";
}

type GoalForm = {
  title: string;
  description: string;
  targetAmount: string;
  savedAmount: string;
  deadline: string;
  status: string;
}

const FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", placeholder: "New laptop", capitalize: true },
  { name: "description", label: "Description", type: "multiline", optional: true },
  { name: "targetAmount", label: "Target", type: "number" },
  { name: "savedAmount", label: "Saved", type: "number" },
  { name: "deadline", label: "Deadline", type: "date", optional: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: ["active", "paused", "completed"],
  },
];

const EMPTY: GoalForm = {
  title: "",
  description: "",
  targetAmount: "",
  savedAmount: "",
  deadline: "",
  status: "active",
};

export default function GoalsScreen() {
  const utils = api.useUtils();
  const { user } = useAuth();
  const colors = useThemeColors();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.goals.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.goals.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  const setStatus = async (id: number, status: GoalRow["status"]) => {
    await trpcClient.goals.setStatus.mutate({ id, status });
    await invalidate();
  };

  const chips = (item: GoalRow): ActionChip[] => [
    { label: "Active", active: item.status === "active", onPress: () => setStatus(item.id, "active") },
    { label: "Paused", active: item.status === "paused", onPress: () => setStatus(item.id, "paused") },
    {
      label: "Done",
      active: item.status === "completed",
      onPress: () => setStatus(item.id, "completed"),
    },
  ];

  return (
    <ModuleScreen<GoalRow, GoalForm>
      title="Goals"
      subtitle={`${data?.total ?? 0} total`}
      icon="flag"
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        title: item.title,
        description: item.description ?? "",
        targetAmount: String(item.targetAmount),
        savedAmount: String(item.savedAmount),
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
        await trpcClient.goals.create.mutate({
          title: form.title,
          description: form.description || null,
          targetAmount: parseFloat(form.targetAmount || "0") || 0,
          savedAmount: parseFloat(form.savedAmount || "0") || 0,
          deadline: form.deadline || null,
          status: form.status as GoalRow["status"],
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.goals.update.mutate({
          id,
          title: form.title,
          description: form.description || null,
          targetAmount: parseFloat(form.targetAmount || "0") || 0,
          savedAmount: parseFloat(form.savedAmount || "0") || 0,
          deadline: form.deadline || null,
          status: form.status as GoalRow["status"],
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.goals.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.title,
        subtitle: item.deadline ? formatDate(item.deadline) : undefined,
        right: `${formatMoney(item.savedAmount, user?.currency)} / ${formatMoney(item.targetAmount, user?.currency)}`,
        accent:
          item.status === "completed"
            ? colors.success
            : item.status === "paused"
              ? colors.textMuted
              : colors.text,
        icon: "flag",
      })}
      actionChips={chips}
    />
  );
}
