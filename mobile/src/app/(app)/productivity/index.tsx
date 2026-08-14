import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/ui";
import { api } from "@/lib/trpc";
import { brand, useThemeColors } from "@/lib/theme";

const MODULES = [
  { route: "/productivity/tasks", label: "Tasks", icon: "checkbox" as const },
  { route: "/productivity/goals", label: "Goals", icon: "flag" as const },
  { route: "/productivity/journal", label: "Journal", icon: "book" as const },
  { route: "/productivity/documents", label: "Documents", icon: "folder-open" as const },
];

export default function ProductivityHub() {
  const colors = useThemeColors();
  const router = useRouter();
  const overview = api.dashboard.overview.useQuery(undefined);
  const tasks = overview.data?.tasks;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ThemedText variant="title" style={{ fontSize: 24 }}>
          Productivity
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: 4 }}>
          Organize tasks, goals and thoughts
        </ThemedText>
      </View>

      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ThemedText variant="caption">Tasks this week</ThemedText>
        <View style={styles.taskRow}>
          <View style={styles.taskStat}>
            <Text style={[styles.taskNum, { color: colors.danger }]}>{tasks?.pending ?? 0}</Text>
            <ThemedText variant="caption">Pending</ThemedText>
          </View>
          <View style={styles.taskStat}>
            <Text style={[styles.taskNum, { color: brand[600] }]}>{tasks?.inProgress ?? 0}</Text>
            <ThemedText variant="caption">In progress</ThemedText>
          </View>
          <View style={styles.taskStat}>
            <Text style={[styles.taskNum, { color: colors.success }]}>{tasks?.done ?? 0}</Text>
            <ThemedText variant="caption">Done</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        {MODULES.map((m) => (
          <Pressable
            key={m.route}
            onPress={() => router.push(m.route as never)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.cardIcon}>
              <Ionicons name={m.icon} size={22} color={brand[600]} />
            </View>
            <Text style={[styles.cardLabel, { color: colors.text }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 130 },
  header: { marginBottom: 16 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20, gap: 12 },
  taskRow: { flexDirection: "row", gap: 28 },
  taskStat: { gap: 2 },
  taskNum: { fontSize: 24, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand[600] + "1a",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 15, fontWeight: "700" },
});
