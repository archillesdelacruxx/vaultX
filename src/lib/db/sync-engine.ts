import {
  db,
  tableFor,
  ENTITY_TABLES,
  newClientId,
  serverIdToClientId,
  setLastSyncAt,
  setUserId,
  type EntityName,
  type LocalRecord,
  type OutboxEntry,
  type OutboxOp,
} from "~/lib/db/db";
import type { RouterInputs, RouterOutputs } from "~/trpc/react";

export type SnapshotOutput = RouterOutputs["sync"]["snapshot"];
export type ChangesOutput = RouterOutputs["sync"]["changes"];
export type PushOutput = RouterOutputs["sync"]["push"];
export type PushInput = RouterInputs["sync"]["push"];

let mutationEpoch = 0;

export function bumpMutationEpoch(): number {
  mutationEpoch += 1;
  return mutationEpoch;
}

/** Store a full snapshot from the server into the local DB. */
export async function applySnapshot(snapshot: SnapshotOutput): Promise<void> {
  await db.transaction(
    "rw",
    [...ENTITY_TABLES, db.meta, db.profile, db.localPin],
    async () => {
      for (const table of ENTITY_TABLES) {
        await tableFor(table).clear();
      }
      for (const table of ENTITY_TABLES) {
        const rows = snapshot.data[table];
        if (Array.isArray(rows)) {
          const records: LocalRecord[] = rows.map((r) => {
            const rec = r as Record<string, unknown>;
            const clientId =
              typeof rec.clientId === "string" && rec.clientId
                ? rec.clientId
                : serverIdToClientId(Number(rec.id));
            return {
              ...rec,
              clientId,
              id: Number(rec.id),
            } as LocalRecord;
          });
          if (records.length > 0) await tableFor(table).bulkPut(records);
        }
      }
      await db.profile.clear();
      await db.profile.put({
        id: snapshot.profile.id,
        name: snapshot.profile.name,
        email: snapshot.profile.email,
        role: snapshot.profile.role,
        currency: snapshot.profile.currency,
      });
      if (snapshot.profile.screenPinHash) {
        await db.localPin.put({
          userId: snapshot.profile.id,
          hash: snapshot.profile.screenPinHash,
        });
      } else {
        await db.localPin.where("userId").equals(snapshot.profile.id).delete();
      }
      await setUserId(snapshot.profile.id);
      await setLastSyncAt(snapshot.serverTime);
    },
  );
  bumpMutationEpoch();
}

/** Apply incremental changes from the server and prune deleted records. */
export async function applyChanges(result: ChangesOutput): Promise<void> {
  await db.transaction("rw", [...ENTITY_TABLES, db.meta], async () => {
    for (const table of ENTITY_TABLES) {
      const changes = result.changes[table];
      if (Array.isArray(changes) && changes.length > 0) {
        const records: LocalRecord[] = changes.map((r) => {
          const rec = r as Record<string, unknown>;
          const clientId =
            typeof rec.clientId === "string" && rec.clientId
              ? rec.clientId
              : serverIdToClientId(Number(rec.id));
          return {
            ...rec,
            clientId,
            id: Number(rec.id),
          } as LocalRecord;
        });
        await tableFor(table).bulkPut(records);
      }

      const active = result.activeIds[table] ?? [];
      const activeSet = new Set(active.map((id) => String(id)));
      const local = await tableFor(table).toArray();
      for (const rec of local) {
        if (rec.id !== null && rec.id > 0 && !activeSet.has(String(rec.id))) {
          await tableFor(table).delete(rec.clientId);
        }
      }
    }
    await setLastSyncAt(result.serverTime);
  });
  bumpMutationEpoch();
}

export interface QueueInput {
  entity: EntityName;
  op: OutboxOp;
  data?: Record<string, unknown>;
  serverId?: number;
  clientId?: string;
}

/** Queue a local operation for later server sync. */
export async function queueOp(input: QueueInput): Promise<string> {
  const clientId =
    input.clientId ?? (input.op === "create" ? newClientId() : "");
  const entry: OutboxEntry = {
    clientId,
    entity: input.entity,
    op: input.op,
    data: input.data ?? {},
    serverId: input.serverId,
    createdAt: new Date().toISOString(),
  };
  await db.outbox.add(entry);
  return clientId;
}

/** Queue a PIN hash change for sync to the server. */
export async function queuePinOp(hash: string | null): Promise<void> {
  await db.outbox.add({
    clientId: "screen-pin",
    entity: "pin",
    op: hash ? "create" : "delete",
    data: { pinHash: hash },
    createdAt: new Date().toISOString(),
  });
  bumpMutationEpoch();
}

/** Write a record locally and queue it for sync. */
export async function localUpsert(
  entity: EntityName,
  data: Record<string, unknown>,
  serverId: number | null,
  clientId: string,
  op: OutboxOp = serverId === null ? "create" : "update",
): Promise<{ clientId: string; id: number | null }> {
  const now = new Date();
  const record: LocalRecord = {
    ...data,
    clientId,
    id: serverId,
    updated_at: now,
  };
  await tableFor(entity).put(record);

  if (op === "create") {
    const pending = await db.outbox
      .filter((e) => e.clientId === clientId && e.entity === entity && e.op === "create")
      .toArray();
    if (pending.length > 0) {
      const first = pending[0]!;
      await db.outbox.update(first.id!, { data, createdAt: new Date().toISOString() });
    } else {
      await queueOp({ entity, op, data, clientId });
    }
  } else {
    await queueOp({ entity, op, data, serverId: serverId ?? undefined, clientId });
  }
  return { clientId, id: serverId };
}

/** Delete a record locally and queue the delete for sync. */
export async function localDelete(
  entity: EntityName,
  record: LocalRecord,
): Promise<void> {
  await tableFor(entity).delete(record.clientId);
  if (record.id && record.id > 0) {
    await queueOp({
      entity,
      op: "delete",
      serverId: record.id,
      clientId: record.clientId,
    });
  } else {
    const pending = await db.outbox
      .filter((e) => e.clientId === record.clientId && e.entity === entity && e.op === "create")
      .toArray();
    for (const entry of pending) {
      await db.outbox.delete(entry.id!);
    }
  }
}

/** Push queued operations to the server and remap local temp ids. */
export async function flushOutbox(
  pushFn: (input: PushInput) => Promise<PushOutput>,
): Promise<void> {
  const ops = await db.outbox.orderBy("id").toArray();
  if (ops.length === 0) return;

  const result = await pushFn({ ops });
  const appliedByClientId = new Map<string, number | null>();
  for (const a of result.applied) {
    appliedByClientId.set(a.clientId, a.serverId);
  }

  await db.transaction("rw", [...ENTITY_TABLES, db.outbox, db.meta], async () => {
    for (const op of ops) {
      if (op.entity === "pin") {
        await db.outbox.delete(op.id!);
        continue;
      }
      const realId = appliedByClientId.get(op.clientId);
      if (op.op === "create" && realId !== undefined && realId !== null) {
        const rec = await tableFor(op.entity).get(op.clientId);
        if (rec) {
          rec.id = realId;
          if (rec.created_at === undefined) rec.created_at = new Date();
          await tableFor(op.entity).put(rec);
        }
      }
      await db.outbox.delete(op.id!);
    }
    await setLastSyncAt(result.serverTime);
  });

  bumpMutationEpoch();
}

/** True when there are pending offline operations. */
export async function hasPendingOps(): Promise<boolean> {
  const count = await db.outbox.count();
  return count > 0;
}
