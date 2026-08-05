import { api, HydrateClient } from "~/trpc/server";

import AuditLogsView from "./view";

export default async function AuditLogsPage() {
  await api.admin.auditLogs.prefetch({ q: "", page: 1 });

  return (
    <HydrateClient>
      <AuditLogsView />
    </HydrateClient>
  );
}
