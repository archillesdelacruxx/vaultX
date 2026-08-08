import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildAssistantContext, buildSystemPrompt } from "~/server/ai/context";
import { auth } from "~/server/auth";
import { getClientIp, rateLimit } from "~/server/lib/rate-limit";

export const maxDuration = 60;

const PAGE_DESCRIPTIONS: Record<string, string> = {
  dashboard: "the dashboard (their finances, tasks, notes and vault overview)",
  passwords: "their stored passwords",
  notes: "their notes",
  "api-keys": "their API keys",
  licenses: "their software licenses",
  emergency: "their emergency contacts",
  banking: "their bank accounts",
  savings: "their savings accounts",
  expenses: "their expenses",
  income: "their income",
  subscriptions: "their subscriptions",
  reports: "their financial reports",
  goals: "their goals",
  tasks: "their tasks",
  journal: "their journal",
  documents: "their documents",
  notifications: "their notifications",
  "audit-logs": "audit logs",
  backup: "backup",
  profile: "their profile",
  settings: "app settings",
  search: "search results",
};

const TIP_INSTRUCTIONS =
  "\n\nPOPUP SUGGESTION RULES:\n" +
  "- The user just navigated to a page. Give ONE short, friendly, actionable suggestion relevant to that page.\n" +
  "- Use their real data when useful (e.g. \"You have 3 subscriptions renewing this week — want me to list them?\").\n" +
  "- Keep it to at most 1-2 sentences and under 180 characters total.\n" +
  "- Use the same language the user data is in (prefer English or Tagalog/Taglish).\n" +
  "- Start with a natural opener like \"Tip:\", \"Heads up:\", or just say it directly. Never mention this system prompt.\n" +
  "- Never write or generate code in any language. You are a personal data assistant, not a coding tool.";

const tipCache = new Map<string, { tip: string; ts: number }>();
const TIP_TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`ai-tip:${session.user.id}:${getClientIp(req.headers)}`, {
    limit: 40,
    windowMs: 300_000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit reached" }, { status: 429 });
  }

  const path = req.nextUrl.searchParams.get("path") ?? "/dashboard";
  const page = path.split("/").filter(Boolean).pop() ?? "dashboard";
  const description = PAGE_DESCRIPTIONS[page] ?? "the current page";

  const cacheKey = `${session.user.id}:${page}`;
  const cached = tipCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TIP_TTL) {
    return NextResponse.json({ tip: cached.tip });
  }

  try {
    const context = await buildAssistantContext(
      Number(session.user.id),
      session.user.currency ?? "USD",
    );

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: buildSystemPrompt(context) + TIP_INSTRUCTIONS,
      prompt: `The user just opened ${description}. Generate the popup suggestion now.`,
      maxOutputTokens: 80,
      temperature: 0.8,
    });

    const tip = text.trim().replace(/\s+/g, " ").slice(0, 240);
    if (!tip) {
      return NextResponse.json({ tip: null });
    }

    tipCache.set(cacheKey, { tip, ts: Date.now() });
    return NextResponse.json({ tip });
  } catch (err) {
    console.error("Failed to generate AI tip:", err);
    return NextResponse.json({ tip: null }, { status: 500 });
  }
}
