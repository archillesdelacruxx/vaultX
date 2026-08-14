import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";
import { formatMoney } from "@/lib/money";
import { api } from "@/lib/trpc";
import { brand, useThemeColors } from "@/lib/theme";

const MODULES = [
  { route: "/finance/expenses", label: "Expenses", icon: "trending-down" as const },
  { route: "/finance/income", label: "Income", icon: "trending-up" as const },
  { route: "/finance/savings", label: "Savings", icon: "cash" as const },
  { route: "/finance/subscriptions", label: "Subscriptions", icon: "refresh" as const },
];

export default function FinanceHub() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const overview = api.dashboard.overview.useQuery(undefined);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ThemedText variant="title" style={{ fontSize: 24 }}>
          Finance
        </ThemedText>
        <ThemedText variant="caption" style={{ marginTop: 4 }}>
          Track money in, out and saved
        </ThemedText>
      </View>

      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <View>
            <ThemedText variant="caption">This month</ThemedText>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatMoney(
                (overview.data?.finance?.incomeThisMonth ?? 0) -
                  (overview.data?.finance?.expenseThisMonth ?? 0),
                user?.currency,
              )}
            </Text>
          </View>
        </View>
        <View style={styles.summaryGrid}>
          <View>
            <ThemedText variant="caption">Income</ThemedText>
            <Text style={[styles.summarySub, { color: colors.success }]}>
              {formatMoney(overview.data?.finance?.incomeThisMonth ?? 0, user?.currency)}
            </Text>
          </View>
          <View>
            <ThemedText variant="caption">Expenses</ThemedText>
            <Text style={[styles.summarySub, { color: colors.danger }]}>
              {formatMoney(overview.data?.finance?.expenseThisMonth ?? 0, user?.currency)}
            </Text>
          </View>
          <View>
            <ThemedText variant="caption">Saved</ThemedText>
            <Text style={[styles.summarySub, { color: colors.text }]}>
              {formatMoney(overview.data?.finance?.saved ?? 0, user?.currency)}
            </Text>
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
  summary: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20, gap: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryValue: { fontSize: 28, fontWeight: "800", marginTop: 2 },
  summaryGrid: { flexDirection: "row", gap: 28 },
  summarySub: { fontSize: 17, fontWeight: "700", marginTop: 2 },
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
