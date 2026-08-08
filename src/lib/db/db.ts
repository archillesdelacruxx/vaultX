import Dexie, { type Table } from "dexie";

export type EntityName =
  | "passwords"
  | "notes"
  | "banking"
  | "emergency"
  | "licenses"
  | "apiKeys"
  | "expenses"
  | "income"
  | "tasks"
  | "journal"
  | "savings"
  | "goals"
  | "subscriptions";

export interface LocalRecord {
  clientId: string;
  id: number | null;
  updated_at: Date;
  [key: string]: unknown;
}

export type OutboxOp = "create" | "update" | "delete";

export type OutboxEntity = EntityName | "pin";

export interface OutboxEntry {
  id?: number;
  clientId: string;
  entity: OutboxEntity;
  op: OutboxOp;
  data: Record<string, unknown>;
  serverId?: number;
  createdAt: string;
}

export interface LocalProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  currency: string;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

export interface LocalPinEntry {
  userId: number;
  hash: string;
}

export class VaultXDB extends Dexie {
  passwords!: Table<LocalRecord, string>;
  notes!: Table<LocalRecord, string>;
  banking!: Table<LocalRecord, string>;
  emergency!: Table<LocalRecord, string>;
  licenses!: Table<LocalRecord, string>;
  apiKeys!: Table<LocalRecord, string>;
  expenses!: Table<LocalRecord, string>;
  income!: Table<LocalRecord, string>;
  tasks!: Table<LocalRecord, string>;
  journal!: Table<LocalRecord, string>;
  savings!: Table<LocalRecord, string>;
  goals!: Table<LocalRecord, string>;
  subscriptions!: Table<LocalRecord, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaEntry, string>;
  profile!: Table<LocalProfile, number>;
  localPin!: Table<LocalPinEntry, number>;

  constructor() {
    super("vaultx-db");
    this.version(1).stores({
      passwords: "clientId, id, updated_at",
      notes: "clientId, id, updated_at",
      banking: "clientId, id, updated_at",
      emergency: "clientId, id, updated_at",
      licenses: "clientId, id, updated_at",
      apiKeys: "clientId, id, updated_at",
      expenses: "clientId, id, updated_at",
      income: "clientId, id, updated_at",
      tasks: "clientId, id, updated_at",
      journal: "clientId, id, updated_at",
      savings: "clientId, id, updated_at",
      goals: "clientId, id, updated_at",
      subscriptions: "clientId, id, updated_at",
      outbox: "++id, entity, createdAt",
      meta: "key",
      profile: "id",
      localPin: "userId",
    });
  }
}

export const db = new VaultXDB();

export const ENTITY_TABLES: EntityName[] = [
  "passwords",
  "notes",
  "banking",
  "emergency",
  "licenses",
  "apiKeys",
  "expenses",
  "income",
  "tasks",
  "journal",
  "savings",
  "goals",
  "subscriptions",
];

export function tableFor(entity: EntityName): Table<LocalRecord, string> {
  return db[entity];
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function serverIdToClientId(serverId: number): string {
  return `s${serverId}`;
}

let tempCounter = 0;

export function newTempId(): number {
  tempCounter += 1;
  return -1 * (Date.now() * 1000 + tempCounter);
}

export async function getMeta(key: string): Promise<unknown> {
  const entry = await db.meta.get(key);
  return entry?.value;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function getUserId(): Promise<number | null> {
  const v = await getMeta("userId");
  return typeof v === "number" ? v : null;
}

export async function setUserId(id: number): Promise<void> {
  await setMeta("userId", id);
}

export async function getLastSyncAt(): Promise<string | null> {
  const v = await getMeta("lastSyncAt");
  return typeof v === "string" ? v : null;
}

export async function setLastSyncAt(iso: string): Promise<void> {
  await setMeta("lastSyncAt", iso);
}

export async function clearLocalData(): Promise<void> {
  await db.transaction("rw", [...ENTITY_TABLES, db.meta, db.outbox, db.profile, db.localPin], async () => {
    for (const table of ENTITY_TABLES) await tableFor(table).clear();
    await db.meta.clear();
    await db.outbox.clear();
    await db.profile.clear();
    await db.localPin.clear();
  });
}
