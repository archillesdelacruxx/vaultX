import React, { useState } from "react";

import { BrandTile } from "@/components/brand-tile";
import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { api, trpcClient } from "@/lib/trpc";

interface PasswordRow {
  id: number;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
}

type PasswordForm = {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

const FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", placeholder: "Netflix", capitalize: true },
  { name: "username", label: "Username", type: "text", placeholder: "user@email.com", optional: true },
  { name: "password", label: "Password", type: "password", optional: true },
  { name: "url", label: "URL", type: "text", placeholder: "https://…", optional: true },
  { name: "notes", label: "Notes", type: "multiline", optional: true },
];

const EMPTY: PasswordForm = { title: "", username: "", password: "", url: "", notes: "" };

export default function PasswordsScreen() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.passwords.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.passwords.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<PasswordRow, PasswordForm>
      title="Passwords"
      subtitle={`${data?.total ?? 0} stored`}
      icon="key"
      hideTitle
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        title: item.title,
        username: item.username ?? "",
        password: item.password,
        url: item.url ?? "",
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
        await trpcClient.passwords.create.mutate({
          title: form.title,
          username: form.username || null,
          password: form.password,
          url: form.url || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.passwords.update.mutate({
          id,
          title: form.title,
          username: form.username || null,
          password: form.password,
          url: form.url || null,
          notes: form.notes || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.passwords.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.title,
        subtitle: [item.username, item.url].filter(Boolean).join(" · "),
        icon: "key",
      })}
      grid
      renderTile={(item) => (
        <BrandTile label={item.title} subtitle={item.url ?? undefined} url={item.url ?? undefined} match={`${item.url ?? ""} ${item.title}`} />
      )}
    />
  );
}
