import { api, HydrateClient } from "~/trpc/server";

import BackupView from "./view";

export default async function BackupPage() {
  await api.admin.backup.prefetch();

  return (
    <HydrateClient>
      <BackupView />
    </HydrateClient>
  );
}
