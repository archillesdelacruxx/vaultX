import { api, HydrateClient } from "~/trpc/server";

import SubscriptionsView from "./view";

export default async function SubscriptionsPage() {
  await api.subscriptions.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <SubscriptionsView />
    </HydrateClient>
  );
}
