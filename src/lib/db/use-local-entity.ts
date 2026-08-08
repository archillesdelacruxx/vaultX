"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";

import { db, type EntityName, type LocalRecord } from "~/lib/db/db";
import { localDelete, localUpsert } from "~/lib/db/sync-engine";
import { useSync } from "~/lib/db/sync-context";

/**
 * Local-first access to a synced entity: live rows from Dexie plus
 * offline-capable create/update/delete that queue to the outbox.
 */
export function useLocalEntity(entity: EntityName) {
  const { syncNow } = useSync();

  const raw = useLiveQuery<LocalRecord[] | undefined>(
    () => db[entity].toArray(),
    [entity],
  );

  const isLoading = raw === undefined;
  const rows = raw ?? [];

  const upsert = useCallback(
    async (record: LocalRecord, data: Record<string, unknown>) => {
      await localUpsert(
        entity,
        data,
        record.id ?? null,
        record.clientId,
        record.id === null ? "create" : "update",
      );
      if (typeof navigator !== "undefined" && navigator.onLine) void syncNow();
    },
    [entity, syncNow],
  );

  const remove = useCallback(
    async (record: LocalRecord) => {
      await localDelete(entity, record);
      if (typeof navigator !== "undefined" && navigator.onLine) void syncNow();
    },
    [entity, syncNow],
  );

  return { rows, isLoading, upsert, remove };
}
