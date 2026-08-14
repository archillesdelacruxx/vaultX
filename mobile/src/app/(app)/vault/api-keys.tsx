import React, { useState } from "react";

import { BrandTile } from "@/components/brand-tile";
import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { api, trpcClient } from "@/lib/trpc";

interface ApiKeyRow {
  id: number;
  name: string;
  apiKey: string;
  provider: string | null;
  scopes: string | null;
  notes: string | null;
}

type ApiKeyForm = {
  name: string;
  apiKey: string;
  provider: string;
  scopes: string;
  notes: string;
}

const FIELDS: FieldDef[] = [
  { name: "name", label: "Name", type: "text", placeholder: "OpenAI", capitalize: true },
  { name: "apiKey", label: "API Key", type: "password", placeholder: "sk-â€¦" },
  { name: "provider", label: "Provider", type: "text", placeholder: "openai", optional: true },
  { name: "scopes", label: "Scopes", type: "text", placeholder: "read, write", optional: true },
  { name: "notes", label: "Notes", type: "multiline", optional: true },
];

const EMPTY: ApiKeyForm = { name: "", apiKey: "", provider: "", scopes: "", notes: "" };

export default function ApiKeysScreen() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.apiKeys.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.apiKeys.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<ApiKeyRow, ApiKeyForm>
      title="API Keys"
      subtitle={`${data?.total ?? 0} stored`}
      icon="code-slash"
      hideTitle
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        name: item.name,
        apiKey: item.apiKey,
        provider: item.provider ?? "",
        scopes: item.scopes ?? "",
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
        await trpcClient.apiKeys.create.mutate({
          name: form.name,
          apiKey: form.apiKey,
          provider: form.provider || null,
          scopes: form.scopes || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.apiKeys.update.mutate({
          id,
          name: form.name,
          apiKey: form.apiKey,
          provider: form.provider || null,
          scopes: form.scopes || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.apiKeys.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.name,
        subtitle: [item.provider, item.scopes].filter(Boolean).join(" · "),
        right: "••••",
        icon: "code-slash",
      })}
      grid
      renderTile={(item) => (
        <BrandTile
          label={item.name}
          subtitle={item.provider ?? undefined}
          match={`${item.name} ${item.provider ?? ""}`}
        />
      )}
    />
  );
}
