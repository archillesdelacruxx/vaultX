import { decrypt, encrypt } from "~/server/lib/crypto";

export const SYNC_ENTITIES = [
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
] as const;

export type SyncEntity = (typeof SYNC_ENTITIES)[number];

/** Coerce a raw DB value into a string, or null when empty. */
function asStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

/** Map an entity name to the corresponding Prisma delegate. */
export function dbModel(db: Record<string, unknown>, entity: SyncEntity) {
  const delegate = db[
    entity === "apiKeys" ? "api_keys" : entity
  ] as Record<string, (args: unknown) => Promise<unknown>>;
  return delegate;
}

/**
 * Convert a raw DB row into the app-facing (decrypted) shape that the
 * client stores locally. Field names match the tRPC list/get outputs.
 */
export function fromDb(entity: SyncEntity, r: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    clientId: asStr(r.client_id),
    id: Number(r.id),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };

  switch (entity) {
    case "passwords":
      return {
        ...base,
        title: asStr(r.title),
        username: asStr(r.username),
        password: decrypt(asStr(r.password_enc) ?? undefined),
        url: asStr(r.url),
        notes: asStr(r.notes),
      };
    case "notes":
      return {
        ...base,
        title: asStr(r.title),
        content: asStr(r.content),
        category: asStr(r.category),
        pinned: Boolean(r.pinned),
      };
    case "banking":
      return {
        ...base,
        bankName: asStr(r.bank_name),
        accountType: asStr(r.account_type),
        accountNumber: decrypt(asStr(r.account_number_enc) ?? undefined),
        cardNumber: decrypt(asStr(r.card_number_enc) ?? undefined),
        cvv: decrypt(asStr(r.cvv_enc) ?? undefined),
        expiry: asStr(r.expiry),
        pin: decrypt(asStr(r.pin_enc) ?? undefined),
        accountHolder: asStr(r.account_holder),
        branch: asStr(r.branch),
        notes: asStr(r.notes),
      };
    case "emergency":
      return {
        ...base,
        category: asStr(r.category),
        name: asStr(r.name),
        phone: decrypt(asStr(r.phone_enc) ?? undefined),
        address: asStr(r.address),
        notes: asStr(r.notes),
      };
    case "licenses":
      return {
        ...base,
        software: asStr(r.software),
        licenseKey: decrypt(asStr(r.license_key_enc) ?? undefined),
        licensedTo: asStr(r.licensed_to),
        expiry: asStr(r.expiry),
        notes: asStr(r.notes),
      };
    case "apiKeys":
      return {
        ...base,
        name: asStr(r.name),
        apiKey: decrypt(asStr(r.api_key_enc) ?? undefined),
        provider: asStr(r.provider),
        scopes: asStr(r.scopes),
        notes: asStr(r.notes),
      };
    case "expenses":
      return {
        ...base,
        title: asStr(r.title),
        amount: Number(r.amount),
        category: asStr(r.category),
        paidOn: asStr(r.paid_on),
        notes: asStr(r.notes),
      };
    case "income":
      return {
        ...base,
        title: asStr(r.title),
        amount: Number(r.amount),
        category: asStr(r.category),
        receivedOn: asStr(r.received_on),
        notes: asStr(r.notes),
      };
    case "tasks":
      return {
        ...base,
        title: asStr(r.title),
        description: asStr(r.description),
        status: asStr(r.status),
        priority: asStr(r.priority),
        due_date: asStr(r.due_date),
        tags: asStr(r.tags),
      };
    case "journal":
      return {
        ...base,
        title: asStr(r.title),
        body: asStr(r.body),
        mood: asStr(r.mood),
        entryDate: asStr(r.entry_date),
      };
    case "savings":
      return {
        ...base,
        name: asStr(r.name),
        targetAmount: Number(r.target_amount),
        currentAmount: Number(r.current_amount),
        deadline: asStr(r.deadline),
        status: asStr(r.status),
      };
    case "goals":
      return {
        ...base,
        title: asStr(r.title),
        description: asStr(r.description),
        targetAmount: Number(r.target_amount),
        savedAmount: Number(r.saved_amount),
        deadline: asStr(r.deadline),
        status: asStr(r.status),
      };
    case "subscriptions":
      return {
        ...base,
        name: asStr(r.name),
        amount: Number(r.amount),
        billingCycle: asStr(r.billing_cycle),
        nextBilling: asStr(r.next_billing),
        autoRenew: Boolean(r.auto_renew),
        notes: asStr(r.notes),
      };
  }
}

/**
 * Build the DB column data (without user_id / client_id / id) from
 * app-facing data received from the client. Sensitive fields are encrypted.
 */
export function toDbData(
  entity: SyncEntity,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const s = asStr;

  switch (entity) {
    case "passwords":
      return {
        title: s(data.title) ?? "",
        username: s(data.username),
        password_enc: data.password ? encrypt(s(data.password) ?? "") : null,
        url: s(data.url),
        notes: s(data.notes),
      };
    case "notes":
      return {
        title: s(data.title) ?? "",
        content: s(data.content) ?? "",
        category: s(data.category),
        pinned: Boolean(data.pinned),
      };
    case "banking":
      return {
        bank_name: s(data.bankName) ?? "",
        account_type: s(data.accountType),
        account_number_enc: data.accountNumber
          ? encrypt(s(data.accountNumber) ?? "")
          : null,
        card_number_enc: data.cardNumber ? encrypt(s(data.cardNumber) ?? "") : null,
        cvv_enc: data.cvv ? encrypt(s(data.cvv) ?? "") : null,
        expiry: s(data.expiry),
        pin_enc: data.pin ? encrypt(s(data.pin) ?? "") : null,
        account_holder: s(data.accountHolder),
        branch: s(data.branch),
        notes: s(data.notes),
      };
    case "emergency":
      return {
        category: s(data.category),
        name: s(data.name) ?? "",
        phone_enc: data.phone ? encrypt(s(data.phone) ?? "") : null,
        address: s(data.address),
        notes: s(data.notes),
      };
    case "licenses":
      return {
        software: s(data.software) ?? "",
        license_key_enc: encrypt(s(data.licenseKey) ?? ""),
        licensed_to: s(data.licensedTo),
        expiry: data.expiry ? new Date(s(data.expiry) ?? "") : null,
        notes: s(data.notes),
      };
    case "apiKeys":
      return {
        name: s(data.name) ?? "",
        api_key_enc: encrypt(s(data.apiKey) ?? ""),
        provider: s(data.provider),
        scopes: s(data.scopes),
        notes: s(data.notes),
      };
    case "expenses":
      return {
        title: s(data.title) ?? "",
        amount: Number(data.amount ?? 0),
        category: s(data.category),
        paid_on: data.paidOn ? new Date(s(data.paidOn) ?? "") : new Date(),
        notes: s(data.notes),
      };
    case "income":
      return {
        title: s(data.title) ?? "",
        amount: Number(data.amount ?? 0),
        category: s(data.category),
        received_on: data.receivedOn ? new Date(s(data.receivedOn) ?? "") : new Date(),
        notes: s(data.notes),
      };
    case "tasks":
      return {
        title: s(data.title) ?? "",
        description: s(data.description),
        status: s(data.status) ?? "pending",
        priority: s(data.priority) ?? "medium",
        due_date: data.due_date ? new Date(s(data.due_date) ?? "") : null,
        tags: s(data.tags),
      };
    case "journal":
      return {
        title: s(data.title),
        body: s(data.body) ?? "",
        mood: s(data.mood),
        entry_date: data.entryDate ? new Date(s(data.entryDate) ?? "") : new Date(),
      };
    case "savings":
      return {
        name: s(data.name) ?? "",
        target_amount: Number(data.targetAmount ?? 0),
        current_amount: Number(data.currentAmount ?? 0),
        deadline: data.deadline ? new Date(s(data.deadline) ?? "") : null,
        status: s(data.status) ?? "active",
      };
    case "goals":
      return {
        title: s(data.title) ?? "",
        description: s(data.description),
        target_amount: Number(data.targetAmount ?? 0),
        saved_amount: Number(data.savedAmount ?? 0),
        deadline: data.deadline ? new Date(s(data.deadline) ?? "") : null,
        status: s(data.status) ?? "active",
      };
    case "subscriptions":
      return {
        name: s(data.name) ?? "",
        amount: Number(data.amount ?? 0),
        billing_cycle: s(data.billingCycle) ?? "monthly",
        next_billing: data.nextBilling ? new Date(s(data.nextBilling) ?? "") : null,
        auto_renew: Boolean(data.autoRenew),
        notes: s(data.notes),
      };
  }
}
