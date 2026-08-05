import { api, HydrateClient } from "~/trpc/server";

import PasswordsView from "./view";

export default async function PasswordsPage() {
  await api.passwords.list.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <PasswordsView />
    </HydrateClient>
  );
}
