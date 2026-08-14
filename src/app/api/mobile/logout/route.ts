import { NextResponse } from "next/server";

import { signOut } from "~/server/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await signOut({ redirect: false });
  } catch {
    // Ignore sign-out failures; the client clears its local session regardless.
  }
  return NextResponse.json({ ok: true });
}
