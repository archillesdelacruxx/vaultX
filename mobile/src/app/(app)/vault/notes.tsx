import React, { useState } from "react";

import { BrandTile } from "@/components/brand-tile";
import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { api, trpcClient } from "@/lib/trpc";

interface NoteRow {
  id: number;
  title: string;
  content: string;
  category: string | null;
  pinned: boolean;
}

type NoteForm = {
  title: string;
  content: string;
  category: string;
  pinned: boolean;
}

const FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", placeholder: "Wi-Fi password", capitalize: true },
  { name: "content", label: "Content", type: "multiline", optional: true },
  { name: "category", label: "Category", type: "text", placeholder: "Personal", optional: true },
  { name: "pinned", label: "Pin to top", type: "switch" },
];

const EMPTY: NoteForm = { title: "", content: "", category: "", pinned: false };

export default function NotesScreen() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.notes.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.notes.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<NoteRow, NoteForm>
      title="Notes"
      subtitle={`${data?.total ?? 0} saved`}
      icon="document-text"
      hideTitle
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        title: item.title,
        content: item.content,
        category: item.category ?? "",
        pinned: item.pinned,
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
        await trpcClient.notes.create.mutate({
          title: form.title,
          content: form.content,
          category: form.category || null,
          pinned: form.pinned,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.notes.update.mutate({
          id,
          title: form.title,
          content: form.content,
          category: form.category || null,
          pinned: form.pinned,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.notes.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.title || "(untitled)",
        subtitle: [item.content.slice(0, 90), item.category].filter(Boolean).join(" · "),
        right: item.pinned ? "📌" : undefined,
        icon: "document-text",
      })}
      grid
      renderTile={(item) => (
        <BrandTile
          label={item.title || "(untitled)"}
          subtitle={item.category ?? undefined}
          match={`${item.title} ${item.category ?? ""}`}
        />
      )}
    />
  );
}
