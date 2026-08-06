"use client";

import { Delete } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { cn } from "~/lib/cn";

export interface PinPadHandle {
  fail: (message: string) => void;
  reset: () => void;
}

interface PinPadProps {
  onComplete: (pin: string) => void;
  disabled?: boolean;
  resetKey?: unknown;
}

export const PinPad = forwardRef<PinPadHandle, PinPadProps>(function PinPad(
  { onComplete, disabled = false, resetKey },
  ref,
) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setPin(Array(6).fill(""));
    setError(null);
    setIsShaking(false);
    const t = setTimeout(() => inputsRef.current[0]?.focus(), 60);
    return () => clearTimeout(t);
  }, [resetKey]);

  useImperativeHandle(ref, () => ({
    fail: (message: string) => {
      setError(message);
      setIsShaking(true);
      setPin(Array(6).fill(""));
      setTimeout(() => {
        setIsShaking(false);
        inputsRef.current[0]?.focus();
      }, 500);
    },
    reset: () => {
      setPin(Array(6).fill(""));
      setError(null);
      inputsRef.current[0]?.focus();
    },
  }));

  const tryComplete = (next: string[]) => {
    if (next.every((d) => d !== "")) {
      onComplete(next.join(""));
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    if (!digit && value !== "") return;

    const next = [...pin];
    next[index] = digit;
    setPin(next);
    setError(null);

    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      tryComplete(next);
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
        const next = [...pin];
        next[lastFilledIndex] = "";
        setPin(next);
        setError(null);
        inputsRef.current[lastFilledIndex]?.focus();
      }
      return;
    }

    const firstEmptyIndex = pin.findIndex((d) => d === "");
    if (firstEmptyIndex !== -1) {
      const next = [...pin];
      next[firstEmptyIndex] = val;
      setPin(next);
      setError(null);

      if (firstEmptyIndex < 5) {
        inputsRef.current[firstEmptyIndex + 1]?.focus();
      }

      if (firstEmptyIndex === 5) {
        tryComplete(next);
      }
    }
  };

  return (
    <>
      <div
        className={cn(
          "my-6 flex justify-center gap-2",
          isShaking && "animate-[shake_0.4s_ease-in-out]",
        )}
      >
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
            disabled={disabled}
            value={digit}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className={cn(
              "h-12 w-11 text-center text-xl font-bold rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 text-slate-900 dark:text-white transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none",
              digit && "border-brand-500 dark:border-brand-500 bg-brand-50/30 dark:bg-brand-500/10",
            )}
          />
        ))}
      </div>

      {error ? (
        <div className="mb-4 text-xs font-semibold text-red-500 dark:text-red-400 animate-pulse">
          {error}
        </div>
      ) : null}

      <div className="w-full max-w-xs grid grid-cols-3 gap-2 mt-1">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            type="button"
            disabled={disabled}
            onClick={() => handleKeypadPress(num)}
            className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleKeypadPress("clear")}
          className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleKeypadPress("0")}
          className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleKeypadPress("backspace")}
          className="flex h-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
          aria-label="Backspace"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </>
  );
});
