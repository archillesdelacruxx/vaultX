import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

import { buildAssistantContext, buildSystemPrompt } from "~/server/ai/context";
import { auth } from "~/server/auth";
import { getClientIp, rateLimit } from "~/server/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const key = `ai:${session.user.id}:${getClientIp(req.headers)}`;
  const limited = rateLimit(key, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return new Response("AI chat rate limit reached. Please try again shortly.", {
      status: 429,
    });
  }

  const { messages } = (await req.json()) as {
    messages: Array<{
      role: "user" | "assistant";
      content?: string;
      parts?: Array<{ type: "text"; text: string }>;
    }>;
  };

  const context = await buildAssistantContext(
    Number(session.user.id),
    session.user.currency ?? "USD",
  );

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: buildSystemPrompt(context),
    messages: messages.map((m) => ({
      role: m.role,
      content:
        m.content ??
        (m.parts ?? []).filter((p) => p.type === "text").map((p) => p.text).join(""),
    })),
  });

  return result.toUIMessageStreamResponse();
}
