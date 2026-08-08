import { createTRPCProxyClient, httpBatchStreamLink } from "@trpc/client";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Raw tRPC client for direct (non-hook) calls, e.g. from the sync engine.
 * Same transformer and batch-stream link as the React wrapper.
 */
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      transformer: SuperJSON,
      url: getBaseUrl() + "/api/trpc",
      headers: () => {
        const headers = new Headers();
        headers.set("x-trpc-source", "vaultx-offline");
        return headers;
      },
    }),
  ],
});
