"use client";

import {
  BadgeCheck,
  CalendarDays,
  Coins,
  Fingerprint,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { Card, PageLoader, StatCard } from "~/components/ui/primitives";
import { useToast } from "~/components/ui/toast";
import { fmtDate, initials } from "~/server/lib/format";
import { api } from "~/trpc/react";

export default function ProfilePage() {
  const toast = useToast();
  const utils = api.useUtils();

  const { data: me, isLoading } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const [name, setName] = useState(me?.name ?? "");

  const updateProfile = api.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast("success", "Profile updated.");
      void utils.auth.me.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  if (isLoading) return <PageLoader />;
  if (!me) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 p-6 text-white shadow-lg shadow-brand-900/20">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold ring-2 ring-white/40 backdrop-blur">
            {initials(me.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{me.name}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-white/70">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {me.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold capitalize backdrop-blur">
                <ShieldCheck className="h-3 w-3" />
                {me.role}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs backdrop-blur">
                <CalendarDays className="h-3 w-3" />
                Member since {fmtDate(me.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs backdrop-blur">
                <BadgeCheck className="h-3 w-3" />
                VaultX ID #{me.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Member since" value={fmtDate(me.createdAt)} icon={CalendarDays} tone="brand" />
        <StatCard label="Role" value={me.role} icon={ShieldCheck} tone="violet" />
        <StatCard label="Currency" value={me.currency} icon={Coins} tone="green" />
      </div>

      <Card title="Display name" subtitle="How your name appears across VaultX.">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) updateProfile.mutate({ name: name.trim() });
          }}
        >
          <div className="flex-1">
            <label className="label">Name</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={updateProfile.isPending}>
            Save changes
          </button>
        </form>
      </Card>

      <Card title="Account details" subtitle="Your VaultX account identity.">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <dt className="flex items-center gap-2 text-slate-400">
              <Mail className="h-4 w-4" />
              Email
            </dt>
            <dd className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
              {me.email}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <dt className="flex items-center gap-2 text-slate-400">
              <Fingerprint className="h-4 w-4" />
              User ID
            </dt>
            <dd className="font-mono text-xs text-slate-500 dark:text-slate-300">#{me.id}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <dt className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Role
            </dt>
            <dd className="badge bg-brand-50 text-brand-700 capitalize dark:bg-brand-500/10 dark:text-brand-300">
              {me.role}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
