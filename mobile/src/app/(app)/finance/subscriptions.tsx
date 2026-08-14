import React, { useState } from "react";

import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { useAuth } from "@/providers/auth-provider";
import { dateToStr, formatDate, formatMoney } from "@/lib/money";
import { api, trpcClient } from "@/lib/trpc";
import { useThemeColors } from "@/lib/theme";

interface SubRow {
  id: number;
  name: string;
  amount: number;
  billingCycle: string;
  nextBilling: Date | null;
  autoRenew: boolean;
  notes: string | null;
}

type SubForm = {
  name: string;
  amount: string;
  billingCycle: string;
  nextBilling: string;
  autoRenew: boolean;
  notes: string;
};

const FIELDS: FieldDef[] = [
  { name: "name", label: "Name", type: "text", placeholder: "Netflix", capitalize: true },
  { name: "amount", label: "Amount", type: "number" },
  {
    name: "billingCycle",
    label: "Billing Cycle",
    type: "select",
    options: ["weekly", "monthly", "quarterly", "yearly"],
  },
  { name: "nextBilling", label: "Next Billing", type: "date", optional: true },
  { name: "autoRenew", label: "Auto-renew", type: "switch" },
  { name: "notes", label: "Notes", type: "multiline", optional: true },
];

const EMPTY: SubForm = {
  name: "",
  amount: "",
  billingCycle: "monthly",
  nextBilling: "",
  autoRenew: true,
  notes: "",
};

export default function SubscriptionsScreen() {
  const utils = api.useUtils();
  const { user } = useAuth();
  const colors = useThemeColors();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.subscriptions.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.subscriptions.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<SubRow, SubForm>
      title="Subscriptions"
      subtitle={`${data?.total ?? 0} tracked`}
      icon="refresh"
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        name: item.name,
        amount: String(item.amount),
        billingCycle: item.billingCycle,
        nextBilling: dateToStr(item.nextBilling),
        autoRenew: item.autoRenew,
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
        await trpcClient.subscriptions.create.mutate({
          name: form.name,
          amount: parseFloat(form.amount || "0") || 0,
          billingCycle: form.billingCycle as "weekly" | "monthly" | "quarterly" | "yearly",
          nextBilling: form.nextBilling || null,
          autoRenew: form.autoRenew,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.subscriptions.update.mutate({
          id,
          name: form.name,
          amount: parseFloat(form.amount || "0") || 0,
          billingCycle: form.billingCycle as "weekly" | "monthly" | "quarterly" | "yearly",
          nextBilling: form.nextBilling || null,
          autoRenew: form.autoRenew,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.subscriptions.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.name,
        subtitle: [item.billingCycle, formatDate(item.nextBilling)].filter(Boolean).join(" · "),
        right: formatMoney(item.amount, user?.currency),
        accent: item.autoRenew ? undefined : colors.success,
        icon: "refresh",
      })}
    />
  );
}
