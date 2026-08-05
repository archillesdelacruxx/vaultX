import { api, HydrateClient } from "~/trpc/server";

import DocumentsView from "./view";

export default async function DocumentsPage() {
  await api.documents.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <DocumentsView />
    </HydrateClient>
  );
}
