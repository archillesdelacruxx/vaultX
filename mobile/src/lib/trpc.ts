import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "~/server/api/root";

import { API_URL } from "./api";
import { getCookie } from "./auth";

export const api = createTRPCReact<AppRouter>();

export function createTrpcLink() {
  return httpBatchLink({
    url: `${API_URL}/api/trpc`,
    transformer: superjson,
    headers: () => {
      const cookie = getCookie();
      return cookie ? { cookie } : {};
    },
  });
}

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [createTrpcLink()],
});
