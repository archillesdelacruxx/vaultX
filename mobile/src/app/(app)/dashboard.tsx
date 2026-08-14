import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ui";
import { brand, useThemeColors } from "@/lib/theme";
import { api } from "@/lib/trpc";
import { useAuth } from "@/providers/auth-provider";

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)}`;
  }
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.statValue, { color: accent ?? colors.text }]}>{value}</Text>
      <ThemedText variant="caption">{label}</ThemedText>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const overview = api.dashboard.overview.useQuery();

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="title">Good day, {firstName}</ThemedText>
          <ThemedText variant="subtitle">Here is your vault at a glance.</ThemedText>
        </View>

        {overview.isLoading ? (
          <ActivityIndicator color={brand[600]} style={{ marginTop: 40 }} />
        ) : overview.error ? (
          <ThemedText variant="caption" style={{ color: colors.danger, marginTop: 20 }}>
            Could not load overview. Pull to retry or check your connection.
          </ThemedText>
        ) : (
          <>
            <View style={styles.section}>
              <ThemedText variant="subtitle" style={{ marginBottom: 10 }}>
                Your vault
              </ThemedText>
              <View style={styles.grid}>
                <StatCard label="Passwords" value={String(overview.data?.stats.passwords ?? 0)} accent={brand[600]} />
                <StatCard label="Notes" value={String(overview.data?.stats.notes ?? 0)} accent={brand[500]} />
                <StatCard label="API keys" value={String(overview.data?.stats.apiKeys ?? 0)} />
                <StatCard label="Licenses" value={String(overview.data?.stats.licenses ?? 0)} />
                <StatCard label="Banking" value={String(overview.data?.stats.banking ?? 0)} />
                <StatCard label="Documents" value={String(overview.data?.stats.documents ?? 0)} />
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText variant="subtitle" style={{ marginBottom: 10 }}>
                Finance this month
              </ThemedText>
              <View style={styles.grid}>
                <StatCard
                  label="Income"
                  value={formatCurrency(overview.data?.finance.incomeThisMonth ?? 0, user?.currency ?? "USD")}
                  accent={colors.success}
                />
                <StatCard
                  label="Expenses"
                  value={formatCurrency(overview.data?.finance.expenseThisMonth ?? 0, user?.currency ?? "USD")}
                  accent={colors.danger}
                />
                <StatCard
                  label="Saved"
                  value={formatCurrency(overview.data?.finance.saved ?? 0, user?.currency ?? "USD")}
                  accent={brand[500]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText variant="subtitle" style={{ marginBottom: 10 }}>
                Tasks
              </ThemedText>
              <View style={styles.grid}>
                <StatCard label="Pending" value={String(overview.data?.tasks.pending ?? 0)} />
                <StatCard label="In progress" value={String(overview.data?.tasks.inProgress ?? 0)} accent={brand[500]} />
                <StatCard label="Done" value={String(overview.data?.tasks.done ?? 0)} accent={colors.success} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 130 },
  header: { marginBottom: 24 },
  section: { marginBottom: 24 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "30%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minWidth: 90,
  },
  statValue: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
});
