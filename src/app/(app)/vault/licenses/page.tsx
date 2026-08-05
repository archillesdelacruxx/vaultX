import { api, HydrateClient } from "~/trpc/server";

import LicensesView from "./view";

export default async function LicensesPage() {
  await api.licenses.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <LicensesView />
    </HydrateClient>
  );
}
