import { ShieldCheck } from "lucide-react";

import { VaultXLogo } from "~/components/ui/logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between bg-brand-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <VaultXLogo onDark />
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Your personal digital vault.
          </h2>
          <p className="mt-3 max-w-md text-sm text-brand-200">
            Passwords, notes, financial records and documents — encrypted and
            organized in one secure place.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-brand-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> AES-256 encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Private by default
          </span>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <VaultXLogo />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
