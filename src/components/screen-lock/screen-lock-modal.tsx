"use client";

import { Delete, KeyRound, Lock, ShieldCheck } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ActionSpinner } from "~/components/ui/action-spinner";
import { cn } from "~/lib/cn";
import { api } from "~/trpc/react";

interface ScreenLockModalProps {
  open: boolean;
  isSetupMode: boolean; // true if user has no PIN yet
  onUnlocked: () => void;
  userName?: string;
}

export function ScreenLockModal({
  open,
  isSetupMode,
  onUnlocked,
  userName = "User",
}: ScreenLockModalProps) {
  const [step, setStep] = useState<"enter" | "setup_first" | "setup_confirm">(
    isSetupMode ? "setup_first" : "enter"
  );
  const [firstPin, setFirstPin] = useState("");
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const verifyMutation = api.auth.verifyScreenPin.useMutation();
  const setPinMutation = api.auth.setScreenPin.useMutation();

  useEffect(() => {
    if (open) {
      setPin(Array(6).fill(""));
      setError(null);
      setStep(isSetupMode ? "setup_first" : "enter");
      setFirstPin("");
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);
    }
  }, [open, isSetupMode]);

  if (!open) return null;

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    if (!digit && value !== "") return;

    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(null);

    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (digit && index === 5 && newPin.every((d) => d !== "")) {
      handleSubmit(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleKeypadPress = (val: string) => {
    if (val === "clear") {
      setPin(Array(6).fill(""));
      setError(null);
      inputsRef.current[0]?.focus();
      return;
    }

    if (val === "backspace") {
      const lastFilledIndex = pin.map(Boolean).lastIndexOf(true);
      if (lastFilledIndex !== -1) {
        const newPin = [...pin];
        newPin[lastFilledIndex] = "";
        setPin(newPin);
        setError(null);
        inputsRef.current[lastFilledIndex]?.focus();
      }
      return;
    }

    const firstEmptyIndex = pin.findIndex((d) => d === "");
    if (firstEmptyIndex !== -1) {
      const newPin = [...pin];
      newPin[firstEmptyIndex] = val;
      setPin(newPin);
      setError(null);

      if (firstEmptyIndex < 5) {
        inputsRef.current[firstEmptyIndex + 1]?.focus();
      }

      if (firstEmptyIndex === 5) {
        handleSubmit(newPin.join(""));
      }
    }
  };

  const handleSubmit = async (enteredPin: string) => {
    if (step === "setup_first") {
      setFirstPin(enteredPin);
      setPin(Array(6).fill(""));
      setStep("setup_confirm");
      setError(null);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
      return;
    }

    if (step === "setup_confirm") {
      if (enteredPin !== firstPin) {
        triggerError("PINs do not match. Please try again.");
        setStep("setup_first");
        setFirstPin("");
        return;
      }
      try {
        await setPinMutation.mutateAsync({ pin: enteredPin });
        onUnlocked();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to set PIN";
        triggerError(msg);
      }
      return;
    }

    // Enter mode (Unlock)
    try {
      const res = await verifyMutation.mutateAsync({ pin: enteredPin });
      if (res.valid) {
        onUnlocked();
      } else {
        triggerError("Incorrect PIN. Please try again.");
      }
    } catch {
      triggerError("Verification failed. Please try again.");
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setPin(Array(6).fill(""));
    setTimeout(() => inputsRef.current[0]?.focus(), 100);
  };

  const isPending = verifyMutation.isPending || setPinMutation.isPending;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-lg">
      <div
        className={cn(
          "card w-full max-w-md p-6 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
          isShaking && "animate-[shake_0.4s_ease-in-out]"
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            {step === "setup_first" || step === "setup_confirm" ? (
              <ShieldCheck className="h-7 w-7 stroke-[2.2]" />
            ) : (
              <Lock className="h-7 w-7 stroke-[2.2]" />
            )}
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {step === "setup_first"
              ? "Set Your Security PIN"
              : step === "setup_confirm"
              ? "Confirm Your Security PIN"
              : `Welcome Back, ${userName}`}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            {step === "setup_first"
              ? "Create a 6-digit numeric PIN to secure your VaultX session."
              : step === "setup_confirm"
              ? "Re-enter your 6-digit PIN to confirm."
              : "Enter your 6-digit numeric PIN to unlock your session."}
          </p>

          {/* 6 Digit Input Boxes */}
          <div className="my-6 flex justify-center gap-2">
            {pin.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                disabled={isPending}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={cn(
                  "h-12 w-11 text-center text-xl font-bold rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 text-slate-900 dark:text-white transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none",
                  digit && "border-brand-500 dark:border-brand-500 bg-brand-50/30 dark:bg-brand-500/10"
                )}
              />
            ))}
          </div>

          {isPending && (
            <div className="mb-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ActionSpinner className="h-4 w-4" /> Verifying...
            </div>
          )}

          {error && (
            <div className="mb-4 text-xs font-semibold text-red-500 dark:text-red-400 animate-pulse">
              {error}
            </div>
          )}

          {/* On-screen Numeric Keypad */}
          <div className="w-full max-w-xs grid grid-cols-3 gap-2 mt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isPending}
                onClick={() => handleKeypadPress(num)}
                className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleKeypadPress("clear")}
              className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleKeypadPress("0")}
              className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleKeypadPress("backspace")}
              className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
              aria-label="Backspace"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
