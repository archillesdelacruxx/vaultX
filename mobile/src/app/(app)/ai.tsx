import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ui";
import { streamChat, type ChatMessage } from "@/lib/chat";
import { api } from "@/lib/trpc";
import { brand, useThemeColors } from "@/lib/theme";

export default function AiScreen() {
  const colors = useThemeColors();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<"report" | "journal" | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const quickActions = api.useUtils();

  const pushAssistant = (content: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant") {
        return [...prev.slice(0, -1), { role: "assistant", content: last.content + content }];
      }
      return [...prev, { role: "assistant", content }];
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      await streamChat(next, pushAssistant);
    } catch (e) {
      pushAssistant(
        e instanceof Error && e.message ? `⚠️ ${e.message}` : "⚠️ Could not reach AI.",
      );
    } finally {
      setLoading(false);
    }
  };

  const runQuick = async (kind: "report" | "journal") => {
    if (quickLoading || loading) return;
    setQuickLoading(kind);
    pushAssistant(kind === "report" ? "Analyzing your finances…" : "Summarizing your journal…");
    try {
      if (kind === "report") {
        const { insights } = await quickActions.ai.reportInsights.fetch({ months: 6 });
        pushAssistant(insights);
      } else {
        const { summary } = await quickActions.ai.journalSummary.fetch({ days: 30 });
        pushAssistant(summary);
      }
    } catch {
      pushAssistant("⚠️ Could not generate that insight.");
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <ThemedText variant="title" style={{ fontSize: 24 }}>
          AI Assistant
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: 4 }}>
          Ask about your data — or tap a quick action
        </ThemedText>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.quickWrap}>
            <Text style={[styles.quickHint, { color: colors.textSecondary }]}>
              VaultX AI can read your transactions, tasks, journal and more.
            </Text>
            <Pressable
              onPress={() => runQuick("report")}
              style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {quickLoading === "report" ? (
                <ActivityIndicator color={brand[600]} size="small" />
              ) : (
                <Text style={[styles.quickText, { color: colors.text }]}>
                  📊 Financial report · last 6 months
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => runQuick("journal")}
              style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {quickLoading === "journal" ? (
                <ActivityIndicator color={brand[600]} size="small" />
              ) : (
                <Text style={[styles.quickText, { color: colors.text }]}>
                  📓 Journal summary · last 30 days
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              m.role === "user"
                ? { backgroundColor: brand[600], alignSelf: "flex-end" }
                : { backgroundColor: colors.card, alignSelf: "flex-start", borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                { color: m.role === "user" ? "#fff" : colors.text },
              ]}
            >
              {m.content}
            </Text>
          </View>
        ))}
        {loading ? (
          <ActivityIndicator color={brand[600]} style={{ alignSelf: "flex-start", marginTop: 8 }} />
        ) : null}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask VaultX AI…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || loading}
            style={[
              styles.sendBtn,
              { backgroundColor: brand[600] },
              (!input.trim() || loading) && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  chatScroll: { flex: 1 },
  chatContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  quickWrap: { gap: 10, marginTop: 8 },
  quickHint: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  quickBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: { fontSize: 14, fontWeight: "600" },
  bubble: {
    maxWidth: "86%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 96,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
