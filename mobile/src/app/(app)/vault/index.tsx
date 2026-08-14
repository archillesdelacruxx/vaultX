import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/ui";
import { brand, useThemeColors } from "@/lib/theme";

const MODULES = [
  { route: "/vault/passwords", label: "Passwords", icon: "key" as const, desc: "Logins & credentials" },
  { route: "/vault/notes", label: "Notes", icon: "document-text" as const, desc: "Private memos" },
  { route: "/vault/api-keys", label: "API Keys", icon: "code-slash" as const, desc: "Tokens & secrets" },
  { route: "/vault/licenses", label: "Licenses", icon: "file-tray-full" as const, desc: "Software keys" },
  { route: "/vault/banking", label: "Banking", icon: "card" as const, desc: "Accounts & cards" },
  { route: "/vault/emergency", label: "Emergency", icon: "medkit" as const, desc: "Contacts & info" },
  { route: "/vault/documents", label: "Documents", icon: "folder-open" as const, desc: "Files & links" },
];

export default function VaultHub() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ThemedText variant="title" style={{ fontSize: 24 }}>
          Vault
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: 4 }}>
          Encrypted storage for everything sensitive
        </ThemedText>
      </View>
      <View style={styles.grid}>
        {MODULES.map((m) => (
          <Pressable
            key={m.route}
            onPress={() => router.push(m.route as never)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.cardIcon}>
              <Ionicons name={m.icon} size={22} color={brand[600]} />
            </View>
            <Text style={[styles.cardLabel, { color: colors.text }]} numberOfLines={1}>
              {m.label}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={1}>
              {m.desc}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 130 },
  header: { marginBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand[600] + "1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  cardLabel: { fontSize: 15, fontWeight: "700" },
  cardDesc: { fontSize: 12 },
});
