import React, { useState } from "react";

import { BrandTile } from "@/components/brand-tile";
import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { api, trpcClient } from "@/lib/trpc";

interface EmergencyRow {
  id: number;
  category: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

type EmergencyForm = {
  category: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
}

const FIELDS: FieldDef[] = [
  {
    name: "category",
    label: "Category",
    type: "select",
    options: ["Contact", "Doctor", "Hospital", "Family", "Insurance", "Other"],
    optional: true,
  },
  { name: "name", label: "Name", type: "text", placeholder: "Dr. Santos", capitalize: true },
  { name: "phone", label: "Phone", type: "text", placeholder: "+63…", optional: true },
  { name: "address", label: "Address", type: "text", optional: true },
  { name: "notes", label: "Notes", type: "multiline", optional: true },
];

const EMPTY: EmergencyForm = { category: "", name: "", phone: "", address: "", notes: "" };

export default function EmergencyScreen() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.emergency.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.emergency.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<EmergencyRow, EmergencyForm>
      title="Emergency"
      subtitle={`${data?.total ?? 0} stored`}
      icon="medkit"
      hideTitle
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        category: item.category ?? "",
        name: item.name,
        phone: item.phone ?? "",
        address: item.address ?? "",
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
        await trpcClient.emergency.create.mutate({
          category: form.category || null,
          name: form.name,
          phone: form.phone || null,
          address: form.address || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.emergency.update.mutate({
          id,
          category: form.category || null,
          name: form.name,
          phone: form.phone || null,
          address: form.address || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.emergency.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.name,
        subtitle: [item.category, item.phone].filter(Boolean).join(" · "),
        right: item.category ?? undefined,
        icon: "medkit",
      })}
      grid
      renderTile={(item) => (
        <BrandTile label={item.name} subtitle={item.category ?? undefined} match={`${item.category ?? ""} ${item.name}`} />
      )}
    />
  );
}
