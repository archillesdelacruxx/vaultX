import { api, HydrateClient } from "~/trpc/server";

import NotesView from "./view";

export default async function NotesPage() {
  await api.notes.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <NotesView />
    </HydrateClient>
  );
}
