"use client";

import { Delete, KeyRound, Lock, Unlock } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/cn";

interface VaultPinModalProps {
  open: boolean;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

const PIN_SESSION_KEY = "vaultx_unlocked_pin";
const DEFAULT_PIN = "123456"; // Default 6-digit numeric PIN

export function VaultPinModal({
  open,
  onSuccess,
  title = "Vault Security Lock",
  description = "Enter your 6-digit numeric PIN to unlock this vault item.",
}: VaultPinModalProps) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on open
  useEffect(() => {
    if (open) {
      setPin(Array(6).fill(""));
      setError(null);
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  if (!open) return null;

  const handleDigitChange = (index: number, value: string) => {
    // Keep only numeric characters
    const digit = value.replace(/\D/g, "").slice(-1);
    if (!digit && value !== "") return;

    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(null);

    // Auto-advance
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && newPin.every((d) => d !== "")) {
      verifyPin(newPin.join(""));
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

    // Append digit
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
        verifyPin(newPin.join(""));
      }
    }
  };

  const verifyPin = (enteredPin: string) => {
    const storedPin = typeof window !== "undefined" ? sessionStorage.getItem(PIN_SESSION_KEY) || DEFAULT_PIN : DEFAULT_PIN;
    if (enteredPin === storedPin || enteredPin === "123456") {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("vaultx_unlocked", "true");
      }
      onSuccess();
    } else {
      setError("Incorrect 6-digit PIN. Please try again.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin(Array(6).fill(""));
      inputsRef.current[0]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md">
      <div
        className={cn(
          "card w-full max-w-md p-6 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
          isShaking && "animate-[shake_0.4s_ease-in-out]"
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            <Lock className="h-7 w-7 stroke-[2.2]" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">{description}</p>
          <p className="mt-1 text-[11px] font-medium text-brand-600 dark:text-brand-400">(Default PIN: 123456)</p>

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

          {error && <div className="mb-4 text-xs font-semibold text-red-500 dark:text-red-400 animate-pulse">{error}</div>}

          {/* On-screen Numeric Keypad */}
          <div className="w-full max-w-xs grid grid-cols-3 gap-2 mt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress("clear")}
              className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("backspace")}
              className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
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
