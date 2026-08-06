"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Bell,
  FileKey2,
  FileText,
  FolderLock,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  LockKeyhole,
  NotebookPen,
  NotepadText,
  PiggyBank,
  ReceiptText,
  Repeat,
  ScrollText,
  Settings,
  ShieldCheck,
  StickyNote,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";

import { cn } from "~/lib/cn";
import { VaultXLogo } from "~/components/ui/logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type NavSection = { title: string; items: NavItem[] };

export function Sidebar({
  role,
  open,
  onClose,
  collapsed,
}: {
  role: string;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
}) {
  const pathname = usePathname();

  const sections: NavSection[] = useMemo(
    () => [
      {
        title: "Home",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ],
      },
      {
        title: "Vault",
        items: [
          { href: "/vault/passwords", label: "Passwords", icon: LockKeyhole },
          { href: "/vault/notes", label: "Notes", icon: StickyNote },
          { href: "/vault/api-keys", label: "API Keys", icon: FileKey2 },
          { href: "/vault/licenses", label: "Licenses", icon: FileText },
          { href: "/vault/emergency", label: "Emergency", icon: LifeBuoy },
        ],
      },
      {
        title: "Finances",
        items: [
          { href: "/finance/banking", label: "Banking", icon: Banknote },
          { href: "/finance/savings", label: "Savings", icon: PiggyBank },
          { href: "/finance/expenses", label: "Expenses", icon: ReceiptText },
          { href: "/finance/income", label: "Income", icon: Wallet },
          { href: "/finance/subscriptions", label: "Subscriptions", icon: Repeat },
          { href: "/finance/reports", label: "Reports", icon: LineChart },
        ],
      },
      {
        title: "Productivity",
        items: [
          { href: "/productivity/goals", label: "Goals", icon: Target },
          { href: "/productivity/tasks", label: "Tasks", icon: NotepadText },
          { href: "/productivity/journal", label: "Journal", icon: NotebookPen },
          { href: "/productivity/documents", label: "Documents", icon: FolderLock },
        ],
      },
      {
        title: "System",
        items: [
          { href: "/notifications", label: "Notifications", icon: Bell },
          { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, adminOnly: true },
          { href: "/admin/backup", label: "Backup", icon: ShieldCheck, adminOnly: true },
        ],
      },
    ],
    [],
  );

  const visible = (item: NavItem) => !item.adminOnly || role === "admin";

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900",
          collapsed && "lg:w-[72px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          {!collapsed ? (
            <Link href="/dashboard" aria-label="VaultX dashboard">
              <VaultXLogo />
            </Link>
          ) : (
            <Link href="/dashboard" aria-label="VaultX dashboard">
              <VaultXLogo wordmark={false} />
            </Link>
          )}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed ? (
                <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.title}
                </div>
              ) : null}
              <div className="space-y-0.5">
                {section.items.filter(visible).map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                        collapsed && "lg:justify-center",
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="space-y-0.5">
            <Link
              href="/profile"
              onClick={onClose}
              title={collapsed ? "Profile" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                collapsed && "lg:justify-center",
              )}
            >
              <UserRound className="h-[18px] w-[18px]" />
              {!collapsed ? "Profile" : null}
            </Link>
            <Link
              href="/settings"
              onClick={onClose}
              title={collapsed ? "Settings" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                collapsed && "lg:justify-center",
              )}
            >
              <Settings className="h-[18px] w-[18px]" />
              {!collapsed ? "Settings" : null}
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
