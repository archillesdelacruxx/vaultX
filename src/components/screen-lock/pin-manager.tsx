"use client";

import { Lock, ShieldCheck } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { ActionSpinner } from "~/components/ui/action-spinner";
import { PinPad, type PinPadHandle } from "~/components/ui/pin-pad";
import { useToast } from "~/components/ui/toast";
import { useScreenPin } from "~/lib/db/pin-hooks";

type Step = "verify" | "first" | "confirm";

interface PinManagerModalProps {
  open: boolean;
  mode: "set" | "remove";
  onClose: () => void;
  onSaved: () => void;
}

export function PinManagerModal({ open, mode, onClose, onSaved }: PinManagerModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<Step>("verify");
  const [firstPin, setFirstPin] = useState("");
  const [isPending, setIsPending] = useState(false);
  const padRef = useRef<PinPadHandle>(null);

  const { hasPin, verify, setPin, removePin } = useScreenPin();

  useEffect(() => {
    if (open) {
      setFirstPin("");
      setStep(mode === "remove" || hasPin ? "verify" : "first");
    }
  }, [open, mode, hasPin]);

  if (!open) return null;

  const handleComplete = async (enteredPin: string) => {
    if (step === "verify") {
      setIsPending(true);
      try {
        if (mode === "remove") {
          await removePin(enteredPin);
          toast("success", "Screen lock PIN removed.");
          onSaved();
          onClose();
          return;
        }
        const res = await verify(enteredPin);
        if (!res.valid) {
          padRef.current?.fail(res.message ?? "Incorrect PIN. Please try again.");
          return;
        }
        setStep("first");
      } catch (err: unknown) {
        padRef.current?.fail(err instanceof Error ? err.message : "Incorrect PIN.");
      } finally {
        setIsPending(false);
      }
      return;
    }

    if (step === "first") {
      setFirstPin(enteredPin);
      setStep("confirm");
      return;
    }

    if (enteredPin !== firstPin) {
      padRef.current?.fail("PINs do not match. Please try again.");
      setFirstPin("");
      setStep("first");
      return;
    }

    setIsPending(true);
    try {
      await setPin(enteredPin);
      toast("success", hasPin ? "Screen lock PIN updated." : "Screen lock PIN set.");
      onSaved();
      onClose();
    } catch (err: unknown) {
      padRef.current?.fail(err instanceof Error ? err.message : "Failed to set PIN.");
    } finally {
      setIsPending(false);
    }
  };

  const title =
    mode === "remove"
      ? "Remove Screen PIN"
      : step === "verify"
        ? "Verify Current PIN"
        : step === "first"
          ? "Set New Screen PIN"
          : "Confirm New Screen PIN";

  const subtitle =
    mode === "remove"
      ? "Enter your current 6-digit PIN to remove the screen lock."
      : step === "verify"
        ? "Enter your current 6-digit PIN to continue."
        : step === "first"
          ? "Choose a 6-digit numeric PIN."
          : "Re-enter your new 6-digit PIN.";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-lg">
      <div className="card w-full max-w-md p-6 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            {mode === "remove" ? <Lock className="h-7 w-7 stroke-[2.2]" /> : <ShieldCheck className="h-7 w-7 stroke-[2.2]" />}
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">{subtitle}</p>

          {isPending ? (
            <div className="my-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ActionSpinner className="h-4 w-4" /> Working...
            </div>
          ) : (
            <PinPad
              ref={padRef}
              onComplete={(pin) => void handleComplete(pin)}
              disabled={isPending}
              resetKey={`${open}-${mode}-${step}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
