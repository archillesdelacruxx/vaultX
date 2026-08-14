import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { signIn } from "~/server/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const jar = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    const session = jar.get(name);
    if (session) {
      return NextResponse.json({ ok: true, name, value: session.value });
    }
  }

  return NextResponse.json({ error: "Sign-in succeeded but no session cookie was issued." }, { status: 500 });
}
