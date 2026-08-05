import { headers } from "next/headers";

import { db } from "~/server/db";

/**
 * Write an entry to the audit_logs table.
 * `userId` may be null for anonymous actions (e.g. failed login attempts).
 */
export async function audit(
  userId: number | null,
  action: string,
  entityType?: string | null,
  entityId?: number | null,
  details?: Record<string, string | number | boolean | null> | null,
): Promise<void> {
  try {
    const hdrs = await headers();
    const ip = (hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? "").split(",")[0]?.trim() ?? "";
    const userAgent = (hdrs.get("user-agent") ?? "").slice(0, 255);

    await db.audit_logs.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details ?? undefined,
        ip,
        user_agent: userAgent,
      },
    });
  } catch {
    // Audit logging must never break the main flow.
  }
}
