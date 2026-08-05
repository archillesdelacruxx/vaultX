import { api, HydrateClient } from "~/trpc/server";

import GoalsView from "./view";

export default async function GoalsPage() {
  await api.goals.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <GoalsView />
    </HydrateClient>
  );
}
