import React, { useState } from "react";

import { type FieldDef } from "@/components/crud/fields";
import { ModuleScreen } from "@/components/crud/module-screen";
import { dateToStr, formatDate } from "@/lib/money";
import { api, trpcClient } from "@/lib/trpc";

interface JournalRow {
  id: number;
  title: string | null;
  body: string;
  mood: string | null;
  entryDate: Date | null;
}

type JournalForm = {
  title: string;
  body: string;
  mood: string;
  entryDate: string;
}

const FIELDS: FieldDef[] = [
  { name: "title", label: "Title", type: "text", placeholder: "Today's thoughts", optional: true, capitalize: true },
  { name: "body", label: "Entry", type: "multiline" },
  {
    name: "mood",
    label: "Mood",
    type: "select",
    options: ["happy", "great", "calm", "okay", "meh", "stressed", "sad", "angry"],
    optional: true,
  },
  { name: "entryDate", label: "Date", type: "date", optional: true },
];

const EMPTY: JournalForm = { title: "", body: "", mood: "", entryDate: "" };

const MOOD_EMOJI: Record<string, string> = {
  happy: "😄",
  great: "🤩",
  calm: "😌",
  okay: "😐",
  meh: "😕",
  stressed: "😫",
  sad: "😢",
  angry: "😠",
};

export default function JournalScreen() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.journal.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const invalidate = async () => {
    await utils.journal.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  return (
    <ModuleScreen<JournalRow, JournalForm>
      title="Journal"
      subtitle={`${data?.total ?? 0} entries`}
      icon="book"
      fields={FIELDS}
      emptyForm={EMPTY}
      toForm={(item) => ({
        title: item.title ?? "",
        body: item.body,
        mood: item.mood ?? "",
        entryDate: dateToStr(item.entryDate),
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
        await trpcClient.journal.create.mutate({
          title: form.title || null,
          body: form.body,
          mood: form.mood || null,
          entryDate: form.entryDate || null,
        });
        await invalidate();
      }}
      onUpdate={async (id, form) => {
        await trpcClient.journal.update.mutate({
          id,
          title: form.title || null,
          body: form.body,
          mood: form.mood || null,
          entryDate: form.entryDate || null,
        });
        await invalidate();
      }}
      onDelete={async (id) => {
        await trpcClient.journal.remove.mutate({ id });
        await invalidate();
      }}
      renderItem={(item) => ({
        title: item.title || "(untitled)",
        subtitle: [item.entryDate ? formatDate(item.entryDate) : undefined, item.body.slice(0, 80)]
          .filter(Boolean)
          .join(" — "),
        right: item.mood ? MOOD_EMOJI[item.mood] ?? item.mood : undefined,
        icon: "book",
      })}
    />
  );
}
