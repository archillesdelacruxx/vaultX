"use client";

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
  pinLength?: number;
  placeholder?: string;
}

export const PinPad = forwardRef<PinPadHandle, PinPadProps>(function PinPad(
  { onComplete, disabled = false, resetKey, pinLength = 6, placeholder = "Enter your PIN" },
  ref,
) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    setError(null);
    setIsShaking(false);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [resetKey]);

  useImperativeHandle(ref, () => ({
    fail: (message: string) => {
      setError(message);
      setIsShaking(true);
      setValue("");
      setTimeout(() => {
        setIsShaking(false);
        inputRef.current?.focus();
      }, 500);
    },
    reset: () => {
      setValue("");
      setError(null);
      inputRef.current?.focus();
    },
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, pinLength);
    setValue(digits);
    setError(null);
    if (digits.length === pinLength) {
      onComplete(digits);
    }
  };

  return (
    <div className="my-6 w-full max-w-xs">
      <div className={cn("w-full", isShaking && "animate-[shake_0.4s_ease-in-out]")}>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={pinLength}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="input w-full text-center text-xl font-bold tracking-[0.5em]"
        />
      </div>

      {error ? (
        <div className="mb-4 text-xs font-semibold text-red-500 dark:text-red-400 animate-pulse">
          {error}
        </div>
      ) : null}
    </div>
  );
});
