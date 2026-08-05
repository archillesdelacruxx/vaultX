import { api, HydrateClient } from "~/trpc/server";

import IncomeView from "./view";

export default async function IncomePage() {
  await api.income.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <IncomeView />
    </HydrateClient>
  );
}
