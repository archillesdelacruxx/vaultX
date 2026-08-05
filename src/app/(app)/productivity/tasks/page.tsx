import { api, HydrateClient } from "~/trpc/server";

import TasksView from "./view";

export default async function TasksPage() {
  await api.tasks.list.prefetch({ q: "", status: "all", page: 1 });

  return (
    <HydrateClient>
      <TasksView />
    </HydrateClient>
  );
}
