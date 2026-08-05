"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

import { cn } from "~/lib/cn";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };

const ToastContext = createContext<{
  toast: (kind: Toast["kind"], message: string) => void;
}>({ toast: () => undefined });

export function useToast() {
  return useContext(ToastContext).toast;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((kind: Toast["kind"], message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    error: <XCircle className="h-4 w-4 text-red-400" />,
    info: <Info className="h-4 w-4 text-brand-400" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg",
              t.kind === "success" && "border-emerald-200 dark:border-emerald-900",
              t.kind === "error" && "border-red-200 dark:border-red-900",
              t.kind === "info" && "border-slate-200 dark:border-slate-800",
              "dark:bg-slate-900",
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[t.kind]}</span>
            <span className="text-slate-700 dark:text-slate-200">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
