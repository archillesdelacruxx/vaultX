import { api, HydrateClient } from "~/trpc/server";

import ProfileView from "./view";

export default async function ProfilePage() {
  await api.auth.me.prefetch();

  return (
    <HydrateClient>
      <ProfileView />
    </HydrateClient>
  );
}
