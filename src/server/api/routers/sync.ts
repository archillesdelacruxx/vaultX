import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { fromDb, SYNC_ENTITIES, toDbData } from "~/server/lib/sync";

const entityEnum = z.enum(["pin", ...SYNC_ENTITIES]);

const opSchema = z.object({
  clientId: z.string().min(1).max(36),
  entity: entityEnum,
  op: z.enum(["create", "update", "delete"]),
  data: z.record(z.unknown()).optional().default({}),
  serverId: z.number().int().optional(),
});

export const syncRouter = createTRPCRouter({
  snapshot: protectedProcedure.query(async ({ ctx }) => {
    const uid = ctx.session.user.id;
    const data: Record<string, unknown[]> = {};

    for (const entity of SYNC_ENTITIES) {
      const delegate = db[entity === "apiKeys" ? "api_keys" : entity] as never;
      const findMany = (delegate as { findMany: (args: unknown) => Promise<unknown[]> })
        .findMany;
      const rows = await findMany({ where: { user_id: uid } });
      data[entity] = rows.map((r) => fromDb(entity, r as never));
    }

    const user = await db.users.findUnique({
      where: { id: uid },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        currency: true,
        screen_pin_hash: true,
      },
    });

    return {
      profile: {
        id: Number(user?.id ?? uid),
        name: user?.name ?? "",
        email: user?.email ?? "",
        role: user?.role ?? "user",
        currency: String(user?.currency ?? "USD"),
        screenPinHash: user?.screen_pin_hash ?? null,
      },
      data,
      serverTime: new Date().toISOString(),
    };
  }),

  changes: protectedProcedure
    .input(z.object({ lastSyncAt: z.string() }))
    .query(async ({ ctx, input }) => {
      const uid = ctx.session.user.id;
      const since = new Date(input.lastSyncAt);
      const changes: Record<string, unknown[]> = {};
      const activeIds: Record<string, number[]> = {};

      for (const entity of SYNC_ENTITIES) {
        const delegate = db[entity === "apiKeys" ? "api_keys" : entity] as never;
        const ops = delegate as {
          findMany: (args: unknown) => Promise<unknown[]>;
        };

        const [updated, all] = await Promise.all([
          ops.findMany({
            where: { user_id: uid, updated_at: { gt: since } },
          }),
          ops.findMany({
            where: { user_id: uid },
            select: { id: true },
          }),
        ]);

        changes[entity] = updated.map((r) => fromDb(entity, r as never));
        activeIds[entity] = (all as Array<{ id: bigint }>).map((r) =>
          Number(r.id),
        );
      }

      return {
        changes,
        activeIds,
        serverTime: new Date().toISOString(),
      };
    }),

  push: protectedProcedure
    .input(z.object({ ops: z.array(opSchema) }))
    .mutation(async ({ ctx, input }) => {
      const uid = ctx.session.user.id;
      const applied: Array<{
        clientId: string;
        entity: string;
        serverId: number | null;
        op: string;
      }> = [];

      for (const op of input.ops) {
        if (op.entity === "pin") {
          const pinHash = typeof op.data.pinHash === "string" ? op.data.pinHash : null;
          await db.users.update({
            where: { id: uid },
            data: { screen_pin_hash: pinHash },
          });
          applied.push({
            clientId: op.clientId,
            entity: "pin",
            serverId: null,
            op: op.op,
          });
          continue;
        }

        const delegate = db[op.entity === "apiKeys" ? "api_keys" : op.entity] as never;
        const ops = delegate as {
          findFirst: (args: unknown) => Promise<{ id: bigint } | null>;
          create: (args: unknown) => Promise<{ id: bigint }>;
          updateMany: (args: unknown) => Promise<{ count: number }>;
          deleteMany: (args: unknown) => Promise<{ count: number }>;
        };
        const baseData = toDbData(op.entity, op.data);

        if (op.op === "create") {
          const existing = await ops.findFirst({
            where: { client_id: op.clientId, user_id: uid },
          });
          if (existing) {
            applied.push({
              clientId: op.clientId,
              entity: op.entity,
              serverId: Number(existing.id),
              op: "create",
            });
            continue;
          }
          const created = await ops.create({
            data: {
              ...baseData,
              user_id: uid,
              client_id: op.clientId,
              updated_at: new Date(),
            },
          });
          applied.push({
            clientId: op.clientId,
            entity: op.entity,
            serverId: Number(created.id),
            op: "create",
          });
          continue;
        }

        if (op.serverId === undefined) {
          applied.push({
            clientId: op.clientId,
            entity: op.entity,
            serverId: null,
            op: op.op,
          });
          continue;
        }

        if (op.op === "update") {
          await ops.updateMany({
            where: { id: op.serverId, user_id: uid },
            data: { ...baseData, updated_at: new Date() },
          });
          applied.push({
            clientId: op.clientId,
            entity: op.entity,
            serverId: op.serverId,
            op: "update",
          });
          continue;
        }

        if (op.op === "delete") {
          await ops.deleteMany({
            where: { id: op.serverId, user_id: uid },
          });
          applied.push({
            clientId: op.clientId,
            entity: op.entity,
            serverId: op.serverId,
            op: "delete",
          });
        }
      }

      return { applied, serverTime: new Date().toISOString() };
    }),
});
