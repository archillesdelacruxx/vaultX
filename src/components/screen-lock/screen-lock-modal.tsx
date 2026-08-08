"use client";

import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { ActionSpinner } from "~/components/ui/action-spinner";
import { PinPad, type PinPadHandle } from "~/components/ui/pin-pad";
import { useScreenPin } from "~/lib/db/pin-hooks";

interface ScreenLockModalProps {
  open: boolean;
  onUnlocked: () => void;
  userName?: string;
}

export function ScreenLockModal({ open, onUnlocked, userName = "User" }: ScreenLockModalProps) {
  const [showForgot, setShowForgot] = useState(false);
  const [password, setPassword] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const padRef = useRef<PinPadHandle>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const { verify, resetWithPassword } = useScreenPin();

  useEffect(() => {
    if (open) {
      setShowForgot(false);
      setPassword("");
      setForgotError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleComplete = async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const res = await verify(enteredPin);
      if (res.valid) {
        onUnlocked();
      } else {
        padRef.current?.fail(res.message ?? "Incorrect PIN. Please try again.");
      }
    } catch {
      padRef.current?.fail("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setIsResetting(true);
    try {
      await resetWithPassword(password);
      onUnlocked();
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Failed to reset PIN.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-lg">
      <div className="card w-full max-w-md p-6 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            {showForgot ? <KeyRound className="h-7 w-7 stroke-[2.2]" /> : <Lock className="h-7 w-7 stroke-[2.2]" />}
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {showForgot ? "Reset Your PIN" : `Welcome Back, ${userName}`}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            {showForgot
              ? "Enter your account password to clear the screen lock PIN. You can set a new one afterwards in Settings."
              : "Enter your 6-digit numeric PIN to unlock your session."}
          </p>

          {showForgot ? (
            <form onSubmit={handleForgotSubmit} className="mt-6 w-full max-w-xs space-y-3">
              <input
                type="password"
                className="input"
                placeholder="Account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isResetting}
                autoFocus
                autoComplete="current-password"
              />
              {forgotError ? (
                <div className="text-xs font-semibold text-red-500 dark:text-red-400 animate-pulse">{forgotError}</div>
              ) : null}
              <button type="submit" className="btn btn-primary w-full" disabled={isResetting || !password}>
                {isResetting ? <ActionSpinner className="h-4 w-4" /> : null}
                Reset PIN
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                onClick={() => {
                  setShowForgot(false);
                  setForgotError(null);
                  setPassword("");
                }}
                disabled={isResetting}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to PIN
              </button>
            </form>
          ) : (
            <>
              {isVerifying ? (
                <div className="my-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ActionSpinner className="h-4 w-4" /> Verifying...
                </div>
              ) : (
                <PinPad
                  ref={padRef}
                  onComplete={(pin) => void handleComplete(pin)}
                  disabled={isVerifying}
                  resetKey={open}
                />
              )}
              <button
                type="button"
                className="mt-4 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={() => setShowForgot(true)}
              >
                Forgot your PIN?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
