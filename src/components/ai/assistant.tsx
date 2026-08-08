"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/cn";

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [tip, setTip] = useState<string | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const { messages, sendMessage, status, error } = useChat<UIMessage>({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
    messages: [
      {
        id: "greeting",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: "Hi! I'm VaultX AI. 👋 I can help you understand your finances, tasks, goals, journal, and more. What would you like to know?",
          },
        ],
      },
    ],
  });

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages, status]);

  useEffect(() => {
    setTipVisible(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    const fetchTip = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/ai/tip?path=${encodeURIComponent(pathname)}`);
          if (!res.ok) return;
          const data = (await res.json()) as { tip?: string | null };
          if (!data.tip || open) return;
          setTip(data.tip);
          setTipVisible(true);
          dismissTimerRef.current = setTimeout(() => setTipVisible(false), 9000);
        } catch {
          // ignore — popup is optional
        }
      })();
    }, 600);

    return () => {
      clearTimeout(fetchTip);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [pathname, open]);

  const busy = status === "submitted" || status === "streaming";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setInput("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-[110] flex flex-col items-end gap-3">
      {open ? (
        <div className="card flex h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-brand-600 px-4 py-3 text-white dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">
                  VaultX AI
                </div>
                <div className="text-[11px] text-brand-100">
                  Powered by Groq
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => {
              const text = m.parts
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("");
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-md bg-brand-600 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
                    )}
                  >
                    {text}
                  </div>
                </div>
              );
            })}
            {busy ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 dark:bg-slate-800">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {error ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                May nangyaring error sa AI. Siguraduhing naka-set ang
                GROQ_API_KEY at subukan muli.
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-700"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything…"
              className="input"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn btn-primary h-9 w-9 shrink-0 p-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      {tipVisible && tip && !open ? (
        <div className="card animate-pop-up relative w-[min(92vw,340px)] shadow-xl">
          <button
            type="button"
            onClick={() => setTipVisible(false)}
            className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Dismiss suggestion"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-brand-600 dark:text-brand-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 pr-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                VaultX AI suggests
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {tip}
              </p>
              <button
                type="button"
                onClick={() => {
                  setTipVisible(false);
                  setOpen(true);
                }}
                className="mt-2 text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Ask me about this →
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:scale-105 hover:bg-brand-700"
        aria-label="Open AI assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        {!open ? (
          <span className="absolute right-1 top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
        ) : null}
      </button>
    </div>
  );
}
