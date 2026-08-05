import { api, HydrateClient } from "~/trpc/server";

import BankingView from "./view";

export default async function BankingPage() {
  await api.banking.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <BankingView />
    </HydrateClient>
  );
}
