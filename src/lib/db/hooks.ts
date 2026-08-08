"use client";

import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";

import {
  db,
  newClientId,
  tableFor,
  type EntityName,
  type LocalRecord,
} from "~/lib/db/db";
import {
  localDelete,
  localUpsert,
} from "~/lib/db/sync-engine";
import { useSync } from "~/lib/db/sync-context";
import { api } from "~/trpc/react";

const PAGE_SIZE = 15;

/** Remove sync-internal fields from user-supplied data. */
function stripMeta(data: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...data };
  delete copy.id;
  delete copy.clientId;
  delete copy.created_at;
  delete copy.updated_at;
  return copy;
}

function matchesQuery(entity: EntityName, rec: LocalRecord, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return Object.entries(rec).some(([key, value]) => {
    if (key === "clientId" || key === "id") return false;
    if (typeof value === "string") return value.toLowerCase().includes(needle);
    if (typeof value === "number") return String(value).includes(needle);
    return false;
  });
}

function sortRecords(entity: EntityName, a: LocalRecord, b: LocalRecord): number {
  if (entity === "notes") {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  }
  const ta = a.updated_at instanceof Date ? a.updated_at.getTime() : 0;
  const tb = b.updated_at instanceof Date ? b.updated_at.getTime() : 0;
  return tb - ta;
}

export interface LocalListData {
  rows: LocalRecord[];
  total: number;
  pages: number;
  page: number;
}

export function useLocalList(
  entity: EntityName,
  input: { q?: string; page?: number },
): { data: LocalListData | undefined; isLoading: boolean; isFetching: boolean } {
  const q = input.q?.trim().toLowerCase() ?? "";
  const page = input.page ?? 1;

  const data = useLiveQuery(
    async () => {
      const all = await tableFor(entity).toArray();
      const filtered = all.filter((r) => matchesQuery(entity, r, q));
      filtered.sort((a, b) => sortRecords(entity, a, b));
      const total = filtered.length;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      return { rows, total, pages, page };
    },
    [entity, q, page],
    undefined,
  );

  return {
    data,
    isLoading: data === undefined,
    isFetching: data === undefined,
  };
}

export function useLocalGet(
  entity: EntityName,
  id: number | null | undefined,
  opts?: { enabled?: boolean },
): { data: LocalRecord | undefined; isLoading: boolean } {
  const enabled = opts?.enabled ?? true;

  const data = useLiveQuery(
    async () => {
      if (!enabled || id == null || id === 0) return undefined;
      return (await tableFor(entity).where("id").equals(id).first()) ?? undefined;
    },
    [entity, id, enabled],
    undefined,
  );

  return { data, isLoading: data === undefined && enabled };
}

export interface LocalMutations {
  create: ReturnType<typeof useMutation<{ id: number | null }, Error, Record<string, unknown>>>;
  update: ReturnType<typeof useMutation<{ id: number | null }, Error, { id: number } & Record<string, unknown>>>;
  remove: ReturnType<typeof useMutation<{ ok: boolean }, Error, { id: number }>>;
  setStatus?: ReturnType<typeof useMutation<{ ok: boolean }, Error, { id: number; status: string }>>;
}

export function useLocalMutations(
  entity: EntityName,
  options?: {
    onSuccess?: (data: unknown) => void;
    onError?: (error: Error) => void;
  },
): LocalMutations {
  const { syncNow } = useSync();
  const utils = api.useUtils();

  const triggerSync = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncNow();
    }
  }, [syncNow]);

  const invalidateDashboards = useCallback(() => {
    void utils.dashboard.overview.invalidate();
  }, [utils]);

  const create = useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const clientId = newClientId();
      const data = stripMeta(input);
      const res = await localUpsert(entity, data, null, clientId, "create");
      triggerSync();
      invalidateDashboards();
      return { id: res.id };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });

  const update = useMutation({
    mutationFn: async (input: { id: number } & Record<string, unknown>) => {
      const { id } = input;
      const rec = await tableFor(entity).where("id").equals(id).first();
      if (!rec) throw new Error("Record not found.");
      const data = stripMeta(input);
      await localUpsert(
        entity,
        data,
        rec.id && rec.id > 0 ? rec.id : null,
        rec.clientId,
        rec.id && rec.id > 0 ? "update" : "create",
      );
      triggerSync();
      return { id };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });

  const remove = useMutation({
    mutationFn: async (input: { id: number }) => {
      const rec = await tableFor(entity).where("id").equals(input.id).first();
      if (rec) await localDelete(entity, rec);
      triggerSync();
      invalidateDashboards();
      return { ok: true };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: number; status: string }) => {
      const rec = await tableFor(entity).where("id").equals(input.id).first();
      if (!rec) throw new Error("Record not found.");
      const data = stripMeta({ ...rec });
      await localUpsert(
        entity,
        { ...data, status: input.status },
        rec.id && rec.id > 0 ? rec.id : null,
        rec.clientId,
        rec.id && rec.id > 0 ? "update" : "create",
      );
      triggerSync();
      return { ok: true };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });

  return { create, update, remove, setStatus };
}

export function useLocalProfile() {
  return useLiveQuery(async () => (await db.profile.toArray())[0], [], undefined);
}
