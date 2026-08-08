"use client";

import { Lock } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { ActionSpinner } from "~/components/ui/action-spinner";
import { PinPad, type PinPadHandle } from "~/components/ui/pin-pad";
import { useScreenPin } from "~/lib/db/pin-hooks";

interface VaultPinModalProps {
  open: boolean;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function VaultPinModal({
  open,
  onSuccess,
  title = "Vault Security Lock",
  description = "Enter your screen lock PIN to unlock this vault item.",
}: VaultPinModalProps) {
  const padRef = useRef<PinPadHandle>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { hasPin, verify } = useScreenPin();

  useEffect(() => {
    if (open && !hasPin) {
      onSuccess();
    }
  }, [open, hasPin, onSuccess]);

  if (!open) return null;

  const handleComplete = async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const res = await verify(enteredPin);
      if (res.valid) {
        onSuccess();
      } else {
        padRef.current?.fail(res.message ?? "Incorrect PIN. Please try again.");
      }
    } catch {
      padRef.current?.fail("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="card w-full max-w-md p-6 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            <Lock className="h-7 w-7 stroke-[2.2]" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">{description}</p>

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
        </div>
      </div>
    </div>
  );
}
