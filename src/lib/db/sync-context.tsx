"use client";

import { useLiveQuery } from "dexie-react-hooks";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { trpc } from "~/trpc/client";
import { db, getLastSyncAt, getUserId } from "~/lib/db/db";
import {
  applyChanges,
  applySnapshot,
  flushOutbox,
} from "~/lib/db/sync-engine";

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingOps: number;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,
  pendingOps: 0,
  syncNow: async () => undefined,
});

export const useSync = () => useContext(SyncContext);

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

export function SyncProvider({
  userId,
  children,
}: {
  userId: number | null;
  children: React.ReactNode;
}) {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const pendingOps =
    useLiveQuery(async () => db.outbox.count(), [], 0) ?? 0;

  const syncNow = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (userIdRef.current == null) return;
    setIsSyncing(true);
    try {
      const localUserId = await getUserId();
      if (localUserId == null || localUserId !== userIdRef.current) {
        const snapshot = await trpc.sync.snapshot.query();
        await applySnapshot(snapshot);
      } else {
        await flushOutbox((input) => trpc.sync.push.mutate(input));
        const last = await getLastSyncAt();
        const result = await trpc.sync.changes.query({
          lastSyncAt: last ?? new Date(0).toISOString(),
        });
        await applyChanges(result);
      }
      setLastSyncAtState(await getLastSyncAt());
    } catch (err) {
      console.error("[sync] failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLastSyncAtState(null);
    void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (isOnline && userId) {
      void syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => {
      if (navigator.onLine) void syncNow();
    }, 60_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <SyncContext.Provider
      value={{ isOnline, isSyncing, lastSyncAt, pendingOps, syncNow }}
    >
      {children}
    </SyncContext.Provider>
  );
}
