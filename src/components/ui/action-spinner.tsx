"use client";

import { Loader2 } from "lucide-react";
import React from "react";
import { cn } from "~/lib/cn";

export function ActionSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-3.5 w-3.5 stroke-[2.5]",
    md: "h-4 w-4 stroke-[2.5]",
    lg: "h-6 w-6 stroke-[2]",
  };

  return (
    <Loader2
      className={cn("animate-spin text-current", sizes[size], className)}
      aria-label="Loading"
    />
  );
}

export function LoadingOverlay({
  visible,
  text = "Processing...",
}: {
  visible: boolean;
  text?: string;
}) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/75 backdrop-blur-xs transition-all dark:bg-slate-900/75">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
        <ActionSpinner size="lg" />
      </div>
      {text ? (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {text}
        </span>
      ) : null}
    </div>
  );
}
