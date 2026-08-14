import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/providers/auth-provider";
import { brand, useThemeColors } from "@/lib/theme";
import { ThemedText } from "@/components/ui";

const PIN_LENGTH = 6;

function KeypadButton({
  digit,
  onPress,
  color,
}: {
  digit: string;
  onPress: (d: string) => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={() => onPress(digit)}
      style={({ pressed }) => [styles.key, pressed && { opacity: 0.6 }]}
    >
      <Text style={[styles.keyText, { color }]}>{digit}</Text>
    </Pressable>
  );
}

export function PinLock() {
  const colors = useThemeColors();
  const { verifyPin, unlock, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const press = async (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === PIN_LENGTH) {
      const ok = await verifyPin(next);
      if (ok) {
        unlock();
      } else {
        setError("Incorrect PIN. Try again.");
        setPin("");
      }
    }
  };

  const backspace = () => setPin((p) => p.slice(0, -1));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>V</Text>
        </View>
        <ThemedText variant="title" style={{ marginTop: 16, fontSize: 26 }}>
          VaultX is locked
        </ThemedText>
        <ThemedText variant="subtitle" style={{ marginTop: 6 }}>
          Enter your 6-digit PIN
        </ThemedText>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length ? { backgroundColor: brand[600] } : { borderColor: colors.border },
            ]}
          />
        ))}
      </View>

      {error ? (
        <ThemedText variant="caption" style={{ color: colors.danger, textAlign: "center" }}>
          {error}
        </ThemedText>
      ) : (
        <View style={{ height: 18 }} />
      )}

      <View style={styles.keypad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeypadButton key={d} digit={d} onPress={press} color={colors.text} />
        ))}
        <View style={styles.key} />
        <KeypadButton digit="0" onPress={press} color={colors.text} />
        <Pressable
          onPress={backspace}
          style={({ pressed }) => [styles.key, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.keyText, { color: colors.textMuted }]}>⌫</Text>
        </Pressable>
      </View>

      <Pressable onPress={logout} style={{ padding: 20, marginTop: 12 }}>
        <Text style={{ color: colors.textMuted, fontSize: 15 }}>Sign out instead</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: brand[600],
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  dots: { flexDirection: "row", gap: 14, marginBottom: 22, minHeight: 18 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 3 * 104 + 2 * 24,
    justifyContent: "space-between",
    marginTop: 16,
  },
  key: { width: 104, height: 86, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 36, fontWeight: "600" },
});
