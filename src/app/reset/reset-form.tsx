"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { api } from "~/trpc/react";
import { AuthShell } from "~/components/auth-shell";
import { Spinner } from "~/components/ui/primitives";

export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const reset = api.auth.resetPassword.useMutation({
    onSuccess: () => router.push("/login"),
    onError: (e) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token. Request a new reset link.");
      return;
    }
    setError("");
    reset.mutate({ token, password });
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter a new password for your account."
      footer={
        <>
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-500/10">
            {error}
          </div>
        ) : null}
        {reset.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10">
            Password updated. Redirecting to sign in…
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={reset.isPending} className="btn btn-primary w-full py-2.5">
          {reset.isPending ? <Spinner /> : <ShieldCheck className="h-4 w-4" />}
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
