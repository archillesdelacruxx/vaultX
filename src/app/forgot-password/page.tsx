"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { useState } from "react";

import { api } from "~/trpc/react";
import { AuthShell } from "~/components/auth-shell";
import { Spinner } from "~/components/ui/primitives";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const forgot = api.auth.forgotPassword.useMutation({
    onSuccess: (res) => setResetUrl(res.resetUrl),
    onError: (e) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    forgot.mutate({ email });
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll generate a reset link for your account."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {resetUrl ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10">
            A reset link was generated for your account.
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700">
            <div className="mb-1 font-semibold text-slate-700 dark:text-slate-300">
              No mail server is configured, so your reset link is:
            </div>
            <Link
              href={resetUrl}
              className="break-all font-medium text-brand-600 hover:underline"
            >
              {resetUrl}
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-500/10">
              {error}
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={forgot.isPending} className="btn btn-primary w-full py-2.5">
            {forgot.isPending ? <Spinner /> : <KeyRound className="h-4 w-4" />}
            Generate reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
