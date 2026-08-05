import { api, HydrateClient } from "~/trpc/server";

import NotificationsView from "./view";

export default async function NotificationsPage() {
  await api.notifications.list.prefetch({ page: 1 });
  await api.notifications.unreadCount.prefetch();

  return (
    <HydrateClient>
      <NotificationsView />
    </HydrateClient>
  );
}
