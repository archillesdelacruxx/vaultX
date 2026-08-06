import type { NextRequest } from "next/server";

import { handlers } from "~/server/auth";
import { getClientIp, rateLimit } from "~/server/lib/rate-limit";

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 60_000;

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback/credentials")) {
    const key = `login:${getClientIp(req.headers)}`;
    const result = rateLimit(key, {
      limit: LOGIN_LIMIT,
      windowMs: LOGIN_WINDOW_MS,
    });
    if (!result.ok) {
      return Response.json(
        { error: "Too many login attempts. Please try again shortly." },
        { status: 429 },
      );
    }
  }
  return handlers.POST(req);
}
