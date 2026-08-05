import { api, HydrateClient } from "~/trpc/server";

import ExpensesView from "./view";

export default async function ExpensesPage() {
  await api.expenses.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <ExpensesView />
    </HydrateClient>
  );
}
