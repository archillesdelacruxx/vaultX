"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";

import { Card } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { api } from "~/trpc/react";

const EMPTY_PASSWORD = { currentPassword: "", newPassword: "", confirm: "" };

export default function SettingsPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [password, setPassword] = useState(EMPTY_PASSWORD);

  const changePassword = api.auth.changePassword.useMutation({
    onSuccess: () => {
      toast("success", "Password changed.");
      setPassword(EMPTY_PASSWORD);
    },
    onError: (e) => toast("error", e.message),
  });

  const deleteAccount = api.auth.deleteAccount.useMutation({
    onError: (e) => toast("error", e.message),
  });

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
