import { adminRouter } from "~/server/api/routers/admin";
import { aiRouter } from "~/server/api/routers/ai";
import { apiKeysRouter } from "~/server/api/routers/apiKeys";
import { authRouter } from "~/server/api/routers/auth";
import { bankingRouter } from "~/server/api/routers/banking";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { documentsRouter } from "~/server/api/routers/documents";
import { emergencyRouter } from "~/server/api/routers/emergency";
import { expensesRouter } from "~/server/api/routers/expenses";
import { goalsRouter } from "~/server/api/routers/goals";
import { incomeRouter } from "~/server/api/routers/income";
import { journalRouter } from "~/server/api/routers/journal";
import { licensesRouter } from "~/server/api/routers/licenses";
import { notesRouter } from "~/server/api/routers/notes";
import { notificationsRouter } from "~/server/api/routers/notifications";
import { passwordsRouter } from "~/server/api/routers/passwords";
import { savingsRouter } from "~/server/api/routers/savings";
import { searchRouter } from "~/server/api/routers/search";
import { subscriptionsRouter } from "~/server/api/routers/subscriptions";
import { syncRouter } from "~/server/api/routers/sync";
import { tasksRouter } from "~/server/api/routers/tasks";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  ai: aiRouter,
  apiKeys: apiKeysRouter,
  auth: authRouter,
  banking: bankingRouter,
  dashboard: dashboardRouter,
  documents: documentsRouter,
  emergency: emergencyRouter,
  expenses: expensesRouter,
  goals: goalsRouter,
  income: incomeRouter,
  journal: journalRouter,
  licenses: licensesRouter,
  notes: notesRouter,
  notifications: notificationsRouter,
  passwords: passwordsRouter,
  savings: savingsRouter,
  search: searchRouter,
  subscriptions: subscriptionsRouter,
  sync: syncRouter,
  tasks: tasksRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
