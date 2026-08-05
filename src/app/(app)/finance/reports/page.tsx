import { api, HydrateClient } from "~/trpc/server";

import ReportsView from "./view";

export default async function ReportsPage() {
  await api.dashboard.overview.prefetch();

  return (
    <HydrateClient>
      <ReportsView />
    </HydrateClient>
  );
}
