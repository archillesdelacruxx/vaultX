import { api, HydrateClient } from "~/trpc/server";

import DashboardView from "./view";

export default async function DashboardPage() {
  await api.dashboard.overview.prefetch();

  return (
    <HydrateClient>
      <DashboardView />
    </HydrateClient>
  );
}
