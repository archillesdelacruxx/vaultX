import { redirect } from "next/navigation";

import { AppShell } from "~/components/app-shell";
import { ScreenLockProvider } from "~/components/screen-lock/screen-lock-provider";
import { auth } from "~/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <ScreenLockProvider userName={session.user.name ?? "User"}>
      <AppShell
        role={session.user.role}
        userName={session.user.name ?? "User"}
        userEmail={session.user.email ?? ""}
        currency={session.user.currency ?? "USD"}
      >
        {children}
      </AppShell>
    </ScreenLockProvider>
  );
}
