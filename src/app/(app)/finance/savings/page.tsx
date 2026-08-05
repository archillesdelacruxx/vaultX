import { api, HydrateClient } from "~/trpc/server";

import SavingsView from "./view";

export default async function SavingsPage() {
  await api.savings.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <SavingsView />
    </HydrateClient>
  );
}
