import { put } from "@vercel/blob";

import { auth } from "~/server/auth";
import { getClientIp, rateLimit } from "~/server/lib/rate-limit";

export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const key = `upload:${session.user.id}:${getClientIp(req.headers)}`;
  const limited = rateLimit(key, {
    limit: 20,
    windowMs: 300_000,
  });
  if (!limited.ok) {
    return new Response("Upload rate limit reached. Please try again shortly.", {
      status: 429,
    });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return new Response("Missing file.", { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return new Response("File too large (max 10 MB).", { status: 413 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const safeExt = /^[a-z0-9]{1,10}$/.test(ext) ? ext : "bin";
  const path = `vaultx/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const blob = await put(path, file, {
    access: "public",
    addRandomSuffix: false,
  });

  return new Response(JSON.stringify({ url: blob.url, size: file.size }), {
    headers: { "content-type": "application/json" },
  });
}
