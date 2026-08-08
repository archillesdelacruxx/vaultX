"use client";

import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { useState } from "react";

import { ActionSpinner } from "~/components/ui/action-spinner";
import { useSync } from "~/lib/db/sync-context";

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingOps, syncNow, lastSyncAt } = useSync();
  const [manualError, setManualError] = useState<string | null>(null);

  if (isOnline && pendingOps === 0) return null;

  const handleRetry = async () => {
    setManualError(null);
    try {
      await syncNow();
    } catch (err: unknown) {
      setManualError(
        err instanceof Error ? err.message : "Sync failed. Please try again.",
      );
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-200">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 text-xs">
        {isOnline ? (
          <span className="inline-flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" />
            You have {pendingOps} unsynced change{pendingOps === 1 ? "" : "s"}.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <CloudOff className="h-3.5 w-3.5" />
            You are offline. Changes are saved locally and will sync when you are
            back online.
          </span>
        )}

        <div className="flex-1" />

        {lastSyncAt ? (
          <span className="text-amber-700/80 dark:text-amber-300/80">
            Last synced {new Date(lastSyncAt).toLocaleTimeString()}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={isSyncing || !isOnline}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/70 px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-500/20 dark:text-amber-100"
        >
          {isSyncing ? (
            <ActionSpinner className="h-3.5 w-3.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Sync now
        </button>
      </div>

      {manualError ? (
        <div className="mx-auto mt-1 max-w-7xl text-xs text-red-600 dark:text-red-400">
          {manualError}
        </div>
      ) : null}
    </div>
  );
}
