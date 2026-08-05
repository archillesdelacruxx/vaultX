import { redirect } from "next/navigation";

import { AppShell } from "~/components/app-shell";
import { auth } from "~/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      role={session.user.role}
      userName={session.user.name ?? "User"}
      userEmail={session.user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
