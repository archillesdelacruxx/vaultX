import { api, HydrateClient } from "~/trpc/server";

import ApiKeysView from "./view";

export default async function ApiKeysPage() {
  await api.apiKeys.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <ApiKeysView />
    </HydrateClient>
  );
}
