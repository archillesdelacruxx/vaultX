import { api, HydrateClient } from "~/trpc/server";

import EmergencyView from "./view";

export default async function EmergencyPage() {
  await api.emergency.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <EmergencyView />
    </HydrateClient>
  );
}
