"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";

import { Card, PageLoader } from "~/components/ui/primitives";
import { useToast } from "~/components/ui/toast";
import { fmtDate } from "~/server/lib/format";
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
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
            {(me.name?.[0] ?? "?").toUpperCase()}
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{me.name}</h2>
            <p className="text-sm text-slate-400">{me.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="badge bg-brand-50 text-brand-700 capitalize dark:bg-brand-500/10 dark:text-brand-300">
                {me.role}
              </span>
              <span className="text-xs text-slate-400">Member since {fmtDate(me.createdAt)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Display name" subtitle="How your name appears across VaultX.">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) updateProfile.mutate({ name: name.trim() });
          }}
        >
          <div className="flex-1">
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={updateProfile.isPending}>
            Save
          </button>
        </form>
      </Card>

      <Card title="Account details">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">Email</dt>
            <dd className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
              <UserRound className="h-4 w-4 text-slate-400" />
              {me.email}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">User ID</dt>
            <dd className="font-mono text-xs text-slate-500 dark:text-slate-300">#{me.id}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
