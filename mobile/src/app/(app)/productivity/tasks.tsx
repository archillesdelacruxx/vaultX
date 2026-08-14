import React, { useState } from "react";

import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen, type ActionChip } from "@/components/crud/module-screen";
import { useThemeColors, brand } from "@/lib/theme";
import { dateToStr, formatDate } from "@/lib/money";
import { api, trpcClient } from "@/lib/trpc";

interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: Date | null;
  tags: string | null;
}

type TaskForm = {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  tags: string;
}

const FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", placeholder: "Buy groceries", capitalize: true },
  { name: "description", label: "Description", type: "multiline", optional: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: ["pending", "in_progress", "done"],
  },
  { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high"] },
  { name: "due_date", label: "Due Date", type: "date", optional: true },
  { name: "tags", label: "Tags", type: "text", placeholder: "work, home", optional: true },
];

const EMPTY: TaskForm = {
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  due_date: "",
  tags: "",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

export default function TasksScreen() {
  const utils = api.useUtils();
  const colors = useThemeColors();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.tasks.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.tasks.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  const setStatus = async (id: number, status: TaskRow["status"]) => {
    await trpcClient.tasks.setStatus.mutate({ id, status });
    await invalidate();
  };

  const chips = (item: TaskRow): ActionChip[] => [
    { label: "Todo", active: item.status === "pending", onPress: () => setStatus(item.id, "pending") },
    {
      label: "Doing",
      active: item.status === "in_progress",
      onPress: () => setStatus(item.id, "in_progress"),
    },
    { label: "Done", active: item.status === "done", onPress: () => setStatus(item.id, "done") },
  ];

  return (
    <ModuleScreen<TaskRow, TaskForm>
      title="Tasks"
      subtitle={`${data?.total ?? 0} total`}
      icon="checkbox"
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        title: item.title,
        description: item.description ?? "",
        status: item.status,
        priority: item.priority,
        due_date: dateToStr(item.due_date),
        tags: item.tags ?? "",
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
        await trpcClient.tasks.create.mutate({
          title: form.title,
          description: form.description || null,
          status: form.status as TaskRow["status"],
          priority: form.priority as TaskRow["priority"],
          due_date: form.due_date || null,
          tags: form.tags || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.tasks.update.mutate({
          id,
          title: form.title,
          description: form.description || null,
          status: form.status as TaskRow["status"],
          priority: form.priority as TaskRow["priority"],
          due_date: form.due_date || null,
          tags: form.tags || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.tasks.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.title,
        subtitle: [item.tags, formatDate(item.due_date)].filter(Boolean).join(" · "),
        right: STATUS_LABEL[item.status],
        accent:
          item.status === "done"
            ? colors.success
            : item.status === "in_progress"
              ? brand[600]
              : colors.textMuted,
        icon: "checkbox",
      })}
      actionChips={chips}
    />
  );
}
