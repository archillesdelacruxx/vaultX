import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand, useThemeColors } from "@/lib/theme";

export function ThemedText({
  children,
  variant = "body",
  style,
  ...props
}: {
  children: ReactNode;
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
  style?: TextStyle;
} & React.ComponentProps<typeof Text>) {
  const colors = useThemeColors();
  const base: TextStyle =
    variant === "title"
      ? { fontSize: 28, fontWeight: "800", color: colors.text }
      : variant === "subtitle"
        ? { fontSize: 16, fontWeight: "600", color: colors.textSecondary }
        : variant === "caption"
          ? { fontSize: 12, color: colors.textMuted }
          : variant === "label"
            ? { fontSize: 13, fontWeight: "500", color: colors.textSecondary }
            : { fontSize: 15, color: colors.text };
  return (
    <Text {...props} style={[base, style]}>
      {children}
    </Text>
  );
}

export function Screen({
  children,
  scroll = false,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const colors = useThemeColors();
  if (scroll) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {children}
      </View>
    );
  }
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  style?: object;
}) {
  const colors = useThemeColors();
  const bg =
    variant === "primary"
      ? brand[600]
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.surface
          : "transparent";
  const fg =
    variant === "primary" || variant === "danger"
      ? "#ffffff"
      : variant === "secondary"
        ? colors.text
        : brand[600];
  const border =
    variant === "secondary"
      ? { borderWidth: 1, borderColor: colors.border }
      : {};
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        border,
        pressed && !loading ? { opacity: 0.85 } : null,
        (disabled || loading) ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  keyboardType,
  secureTextEntry,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.field}>
      {label ? <ThemedText variant="label">{label}</ThemedText> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        keyboardType={keyboardType as KeyboardTypeOptions | undefined}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
        ]}
      />
      {error ? (
        <ThemedText variant="caption" style={{ color: colors.danger }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function AuthScreen({
  children,
  title,
  subtitle,
  footer,
}: {
  children?: ReactNode;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.auth, { backgroundColor: colors.background }]}
    >
      <SafeAreaView style={styles.authSafe}>
        <View style={styles.authInner}>
          <View style={styles.authHeader}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: brand[600],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>V</Text>
            </View>
            <ThemedText variant="title" style={{ marginTop: 16 }}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText variant="subtitle" style={{ marginTop: 4 }}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.authBody}>{children}</View>
          {footer ? (
            <View style={[styles.authFooter, { borderTopColor: colors.border }]}>
              {footer}
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: { fontSize: 15, fontWeight: "700" },
  field: { marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  auth: { flex: 1 },
  authSafe: { flex: 1 },
  authInner: { flex: 1, paddingHorizontal: 24, paddingVertical: 32 },
  authHeader: { alignItems: "center", marginBottom: 28 },
  authBody: { flex: 1 },
  authFooter: {
    borderTopWidth: 1,
    paddingTop: 18,
    alignItems: "center",
  },
});
