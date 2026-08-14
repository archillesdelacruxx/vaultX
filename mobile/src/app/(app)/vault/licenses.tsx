import React, { useState } from "react";

import { BrandTile } from "@/components/brand-tile";
import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { dateToStr, formatDate } from "@/lib/money";
import { api, trpcClient } from "@/lib/trpc";

interface LicenseRow {
  id: number;
  software: string;
  licenseKey: string;
  licensedTo: string | null;
  expiry: Date | null;
  notes: string | null;
}

type LicenseForm = {
  software: string;
  licenseKey: string;
  licensedTo: string;
  expiry: string;
  notes: string;
}

const FIELDS: FieldDef[] = [
  { name: "software", label: "Software", type: "text", placeholder: "Photoshop", capitalize: true },
  { name: "licenseKey", label: "License Key", type: "password" },
  { name: "licensedTo", label: "Licensed To", type: "text", placeholder: "John Doe", optional: true },
  { name: "expiry", label: "Expiry", type: "date", optional: true },
  { name: "notes", label: "Notes", type: "multiline", optional: true },
];

const EMPTY: LicenseForm = { software: "", licenseKey: "", licensedTo: "", expiry: "", notes: "" };

export default function LicensesScreen() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.licenses.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.licenses.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<LicenseRow, LicenseForm>
      title="Licenses"
      subtitle={`${data?.total ?? 0} stored`}
      icon="file-tray-full"
      hideTitle
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        software: item.software,
        licenseKey: item.licenseKey,
        licensedTo: item.licensedTo ?? "",
        expiry: dateToStr(item.expiry),
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
        await trpcClient.licenses.create.mutate({
          software: form.software,
          licenseKey: form.licenseKey,
          licensedTo: form.licensedTo || null,
          expiry: form.expiry || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.licenses.update.mutate({
          id,
          software: form.software,
          licenseKey: form.licenseKey,
          licensedTo: form.licensedTo || null,
          expiry: form.expiry || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.licenses.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.software,
        subtitle: item.licensedTo ?? undefined,
        right: formatDate(item.expiry),
        icon: "file-tray-full",
      })}
      grid
      renderTile={(item) => (
        <BrandTile label={item.software} subtitle={item.licensedTo ?? undefined} match={item.software} />
      )}
    />
  );
}
