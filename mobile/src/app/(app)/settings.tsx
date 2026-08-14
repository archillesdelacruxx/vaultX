import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, TextField, ThemedText } from "@/components/ui";
import { brand, useThemeColors } from "@/lib/theme";
import { api } from "@/lib/trpc";
import { useAuth } from "@/providers/auth-provider";

function SectionCard({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ThemedText variant="subtitle" style={{ marginBottom: 12 }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { user, logout } = useAuth();
  const hasPin = api.auth.hasScreenPin.useQuery();
  const setPin = api.auth.setScreenPin.useMutation({
    onSuccess: () => hasPin.refetch(),
  });
  const removePin = api.auth.removeScreenPin.useMutation({
    onSuccess: () => hasPin.refetch(),
  });
  const resetPin = api.auth.resetScreenPinWithPassword.useMutation({
    onSuccess: () => hasPin.refetch(),
  });

  const [newPin, setNewPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [notifPage, setNotifPage] = useState(1);
  const notifQuery = api.notifications.list.useQuery({ page: notifPage });
  const unreadCount = api.notifications.unreadCount.useQuery();
  const markRead = api.notifications.markRead.useMutation({
    onSuccess: () => {
      notifQuery.refetch();
      unreadCount.refetch();
    },
  });
  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: () => {
      notifQuery.refetch();
      unreadCount.refetch();
    },
  });
  const removeNotif = api.notifications.remove.useMutation({
    onSuccess: () => {
      notifQuery.refetch();
      unreadCount.refetch();
    },
  });
  const clearNotifs = api.notifications.clearAll.useMutation({
    onSuccess: () => {
      notifQuery.refetch();
      unreadCount.refetch();
    },
  });

  const showError = (e: unknown) => {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    setErr(message);
    setMsg("");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="title">Settings</ThemedText>
        <ThemedText variant="subtitle" style={{ marginTop: 4, marginBottom: 20 }}>
          Account, security and preferences.
        </ThemedText>

        <SectionCard title="Account" colors={colors}>
          <ThemedText variant="body" style={{ fontWeight: "700" }}>
            {user?.name}
          </ThemedText>
          <ThemedText variant="caption">{user?.email}</ThemedText>
          <ThemedText variant="caption" style={{ marginTop: 2 }}>
            Currency: {user?.currency ?? "USD"}
          </ThemedText>
        </SectionCard>

        <SectionCard title="Screen lock PIN" colors={colors}>
          {hasPin.isLoading ? (
            <ActivityIndicator color={brand[600]} />
          ) : hasPin.data?.hasPin ? (
            <View style={{ gap: 12 }}>
              <TextField
                label="Current PIN (to remove)"
                placeholder="6-digit PIN"
                keyboardType="number-pad"
                secureTextEntry
                value={currentPin}
                onChangeText={setCurrentPin}
                maxLength={6}
              />
              <Button
                title="Remove PIN"
                variant="danger"
                loading={removePin.isPending}
                onPress={() =>
                  removePin.mutate(
                    { pin: currentPin },
                    {
                      onSuccess: () => {
                        setCurrentPin("");
                        setMsg("Screen lock PIN removed.");
                      },
                      onError: showError,
                    },
                  )
                }
              />

              <TextField
                label="Account password (to reset PIN)"
                placeholder="Your account password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Button
                title="Reset PIN with password"
                variant="secondary"
                loading={resetPin.isPending}
                onPress={() =>
                  resetPin.mutate(
                    { password },
                    {
                      onSuccess: () => {
                        setPassword("");
                        setMsg("Screen lock PIN removed via password.");
                      },
                      onError: showError,
                    },
                  )
                }
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <TextField
                label="Set a 6-digit PIN"
                placeholder="Enter a new PIN"
                keyboardType="number-pad"
                secureTextEntry
                value={newPin}
                onChangeText={setNewPin}
                maxLength={6}
              />
              <Button
                title="Set PIN"
                loading={setPin.isPending}
                onPress={() =>
                  setPin.mutate(
                    { pin: newPin },
                    {
                      onSuccess: () => {
                        setNewPin("");
                        setMsg("PIN set. You will be asked for it when the app opens.");
                      },
                      onError: showError,
                    },
                  )
                }
              />
            </View>
          )}

          {msg ? (
            <Text style={{ color: colors.success, fontSize: 13, marginTop: 10 }}>{msg}</Text>
          ) : null}
          {err ? (
            <Text style={{ color: colors.danger, fontSize: 13, marginTop: 10 }}>{err}</Text>
          ) : null}
        </SectionCard>

        <SectionCard title="Notifications" colors={colors}>
          <View style={styles.notifHeader}>
            <ThemedText variant="caption">
              {(unreadCount.data?.count ?? 0) > 0
                ? `${unreadCount.data?.count} unread`
                : "No unread notifications"}
            </ThemedText>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <Pressable
                onPress={() => markAllRead.mutate()}
                hitSlop={8}
                disabled={(unreadCount.data?.count ?? 0) === 0}
              >
                <Text
                  style={{
                    color: brand[600],
                    fontWeight: "600",
                    fontSize: 13,
                    opacity: (unreadCount.data?.count ?? 0) === 0 ? 0.4 : 1,
                  }}
                >
                  Mark all read
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert("Clear all", "Delete all notifications?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear", style: "destructive", onPress: () => clearNotifs.mutate() },
                  ])
                }
                hitSlop={8}
                disabled={(notifQuery.data?.total ?? 0) === 0}
              >
                <Text
                  style={{
                    color: colors.danger,
                    fontWeight: "600",
                    fontSize: 13,
                    opacity: (notifQuery.data?.total ?? 0) === 0 ? 0.4 : 1,
                  }}
                >
                  Clear all
                </Text>
              </Pressable>
            </View>
          </View>

          {notifQuery.isLoading ? (
            <ActivityIndicator color={brand[600]} style={{ marginTop: 12 }} />
          ) : (notifQuery.data?.rows ?? []).length === 0 ? (
            <ThemedText variant="caption" style={{ marginTop: 12 }}>
              No notifications yet.
            </ThemedText>
          ) : (
            <View style={{ gap: 10, marginTop: 12 }}>
              {notifQuery.data?.rows.map((n) => {
                const isRead = Boolean(n.is_read);
                return (
                  <Pressable
                    key={String(n.id)}
                    onPress={() => {
                      if (!isRead) markRead.mutate({ id: Number(n.id) });
                    }}
                    onLongPress={() =>
                      Alert.alert("Delete", "Delete this notification?", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => removeNotif.mutate({ id: Number(n.id) }),
                        },
                      ])
                    }
                    style={[
                      styles.notif,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      !isRead && { borderColor: brand[600] },
                    ]}
                  >
                    <View style={styles.notifDot}>
                      {!isRead ? <View style={styles.notifDotInner} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>
                        {String(n.title)}
                      </Text>
                      {n.body ? (
                        <Text
                          style={[styles.notifBody, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {String(n.body)}
                        </Text>
                      ) : null}
                      <ThemedText variant="caption" style={{ marginTop: 2 }}>
                        {new Date(String(n.created_at)).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
              {(notifQuery.data?.page ?? 1) < (notifQuery.data?.pages ?? 1) ? (
                <Pressable onPress={() => setNotifPage((p) => p + 1)} style={{ padding: 8 }}>
                  <Text style={{ color: brand[600], textAlign: "center", fontWeight: "600" }}>
                    Load more
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </SectionCard>

        <View style={{ marginTop: 8 }}>
          <Button title="Sign out" variant="danger" onPress={logout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 130 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notif: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  notifDot: { width: 18, alignItems: "flex-start", paddingTop: 4 },
  notifDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: brand[600] },
  notifTitle: { fontSize: 14, fontWeight: "700" },
  notifBody: { fontSize: 13, marginTop: 2 },
});
