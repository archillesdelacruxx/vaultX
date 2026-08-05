import { api, HydrateClient } from "~/trpc/server";

import JournalView from "./view";

export default async function JournalPage() {
  await api.journal.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <JournalView />
    </HydrateClient>
  );
}
