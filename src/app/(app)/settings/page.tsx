"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { CURRENCY_OPTIONS } from "~/server/lib/format";
import { cn } from "~/lib/cn";
import { api } from "~/trpc/react";

const EMPTY_PASSWORD = { currentPassword: "", newPassword: "", confirm: "" };

export default function SettingsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();
  const router = useRouter();

  const [password, setPassword] = useState(EMPTY_PASSWORD);

  const { data: me } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const currency = me?.currency ?? "USD";

  const changePassword = api.auth.changePassword.useMutation({
    onSuccess: () => {
      toast("success", "Password changed.");
      setPassword(EMPTY_PASSWORD);
    },
    onError: (e) => toast("error", e.message),
  });

  const updateProfile = api.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast("success", "Profile updated.");
      void utils.auth.me.invalidate();
      void router.refresh();
    },
    onError: (e) => toast("error", e.message),
  });

  const deleteAccount = api.auth.deleteAccount.useMutation({
    onError: (e) => toast("error", e.message),
  });

  const handleChangeCurrency = (next: string) => {
    updateProfile.mutate({ name: me?.name ?? "", currency: next });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.newPassword !== password.confirm) {
      toast("error", "New passwords do not match.");
      return;
    }
    changePassword.mutate({ currentPassword: password.currentPassword, newPassword: password.newPassword });
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm({
      title: "Delete account",
      message: "This permanently deletes your account and all stored data. This cannot be undone.",
      confirmLabel: "Delete account",
    });
    if (ok) {
      await deleteAccount.mutateAsync();
      window.location.href = "/api/auth/signout";
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card title="Change password" subtitle="Your master password for signing in to VaultX.">
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label">Current password</label>
            <input
              className="input"
              type="password"
              value={password.currentPassword}
              onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                value={password.newPassword}
                onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                className="input"
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={changePassword.isPending}>
            <KeyRound className="h-4 w-4" /> Change password
          </button>
        </form>
      </Card>

      <Card
        title="Currency preference"
        subtitle="The currency used across reports, exports, and the AI assistant."
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {CURRENCY_OPTIONS.filter((c) => c !== "Other").map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleChangeCurrency(c)}
                disabled={updateProfile.isPending || currency === c}
                className={cn(
                  "btn",
                  currency === c
                    ? "btn-primary"
                    : "btn-secondary",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Currently: <span className="font-medium text-slate-600 dark:text-slate-300">{currency}</span>
          </p>
        </div>
      </Card>

      <Card
        title="Danger zone"
        subtitle="These actions are irreversible."
        bodyClassName="border-t border-red-100 dark:border-red-900/40"
      >
        <div className="rounded-xl border border-red-200 p-4 dark:border-red-900/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Delete account</div>
              <p className="text-xs text-slate-400">Permanently removes your account and every piece of stored data.</p>
            </div>
            <button type="button" className="btn btn-danger" onClick={handleDeleteAccount} disabled={deleteAccount.isPending}>
              <Trash2 className="h-4 w-4" /> Delete account
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
