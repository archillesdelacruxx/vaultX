import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { audit } from "~/server/lib/audit";

export const notificationsRouter = createTRPCRouter({
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await db.notifications.count({
      where: { user_id: ctx.session.user.id, is_read: false },
    });
    return { count };
  }),

  list: protectedProcedure
    .input(z.object({ page: z.number().int().min(1).default(1) }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const per = 20;
      const [total, rows] = await Promise.all([
        db.notifications.count({ where: { user_id: ctx.session.user.id } }),
        db.notifications.findMany({
          where: { user_id: ctx.session.user.id },
          orderBy: { created_at: "desc" },
          skip: (page - 1) * per,
          take: per,
        }),
      ]);
      return { rows, total, pages: Math.max(1, Math.ceil(total / per)), page };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await db.notifications.updateMany({
        where: { id: input.id, user_id: ctx.session.user.id },
        data: { is_read: true },
      });
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.notifications.updateMany({
      where: { user_id: ctx.session.user.id, is_read: false },
      data: { is_read: true },
    });
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await db.notifications.deleteMany({
        where: { id: input.id, user_id: ctx.session.user.id },
      });
      await audit(ctx.session.user.id, "notification.delete", "notifications", input.id);
    }),

  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    await db.notifications.deleteMany({ where: { user_id: ctx.session.user.id } });
    await audit(ctx.session.user.id, "notification.clear", "notifications");
  }),
});
