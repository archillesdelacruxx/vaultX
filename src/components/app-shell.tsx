"use client";

import { Bell, Lock, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AiAssistant } from "~/components/ai/assistant";
import { CurrencyProvider } from "~/components/currency-context";
import { TopProgressBar } from "~/components/top-progress-bar";
import { ThemeToggle } from "~/components/theme-toggle";
import { Sidebar } from "~/components/sidebar";
import { useScreenLock } from "~/components/screen-lock/screen-lock-provider";
import { api } from "~/trpc/react";
import { initials } from "~/server/lib/format";
import { cn } from "~/lib/cn";

function NotificationBell() {
  const { data } = api.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const count = data?.count ?? 0;
  return (
    <Link href="/notifications" className="icon-btn relative" aria-label="Notifications">
      <Bell className="h-[18px] w-[18px]" />
      {count > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({
  role,
  userName,
  userEmail,
  currency,
  children,
}: {
  role: string;
  userName: string;
  userEmail: string;
  currency: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { lockScreen } = useScreenLock();

  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const currentLabel = (() => {
    const map: Record<string, string> = {
      dashboard: "Dashboard",
      passwords: "Passwords",
      notes: "Notes",
      "api-keys": "API Keys",
      licenses: "Licenses",
      emergency: "Emergency",
      banking: "Banking",
      savings: "Savings",
      expenses: "Expenses",
      income: "Income",
      subscriptions: "Subscriptions",
      reports: "Reports",
      goals: "Goals",
      tasks: "Tasks",
      journal: "Journal",
      documents: "Documents",
      notifications: "Notifications",
      "audit-logs": "Audit Logs",
      backup: "Backup",
      profile: "Profile",
      settings: "Settings",
    };
    const seg = pathname.split("/").filter(Boolean).pop() ?? "";
    return map[seg] ?? "Dashboard";
  })();

  return (
    <CurrencyProvider currency={currency}>
      <>
        <TopProgressBar />
        <div className="min-h-screen">
        <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
      />

      <div className={cn("flex min-h-screen flex-col transition-all duration-200 lg:pl-64", collapsed && "lg:pl-[72px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <button type="button" className="icon-btn lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="icon-btn hidden lg:inline-flex"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>

          <div className="text-sm font-semibold text-slate-900 dark:text-white">{currentLabel}</div>

          <div className="ml-auto flex items-center gap-1">
            <div className="relative mr-1 hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search…"
                className="input w-56 py-1.5 pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value.trim();
                    if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
                  }
                }}
              />
            </div>
            <ThemeToggle />
            <NotificationBell />

            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
                aria-label="User menu"
              >
                {initials(userName)}
              </button>
              {menuOpen ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{userName}</div>
                      <div className="truncate text-xs text-slate-400">{userEmail}</div>
                    </div>
                    <Link href="/profile" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                      Profile
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        lockScreen();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Lock className="h-4 w-4" /> Lock Screen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void signOut({ callbackUrl: "/login?signedOut=1" });
                      }}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:border-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>

        <footer className="px-6 py-4 text-center text-xs text-slate-400">
          VaultX · your personal digital vault
        </footer>
      </div>

      <AiAssistant />
    </div>
      </>
    </CurrencyProvider>
  );
}
