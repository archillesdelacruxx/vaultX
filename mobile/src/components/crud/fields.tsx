import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { TextField, ThemedText } from "@/components/ui";
import { brand, useThemeColors } from "@/lib/theme";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "multiline" | "number" | "date" | "password" | "switch" | "select";
  placeholder?: string;
  options?: string[];
  maxLength?: number;
  optional?: boolean;
  capitalize?: boolean;
}

export type FormValue = string | boolean;

function PasswordField({
  field,
  value,
  onChange,
  colors,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <ThemedText variant="label">{field.label}</ThemedText>
      <View style={styles.passwordWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={field.maxLength}
          style={[
            styles.input,
            styles.passwordInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}
          hitSlop={10}
        >
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>
            {visible ? "🙈" : "👁"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function renderField(
  field: FieldDef,
  value: FormValue,
  onChange: (name: string, value: FormValue) => void,
  colors: ReturnType<typeof useThemeColors>,
) {
  const str = typeof value === "string" ? value : String(value);
  const setStr = (v: string) => onChange(field.name, v);
  const cap = field.capitalize ? "sentences" : "none";

  switch (field.type) {
    case "multiline":
      return (
        <View style={styles.field}>
          <ThemedText variant="label">{field.label}</ThemedText>
          <TextInput
            value={str}
            onChangeText={setStr}
            placeholder={field.placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            maxLength={field.maxLength}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        </View>
      );
    case "number":
      return (
        <TextField
          label={field.label}
          value={str}
          onChangeText={setStr}
          placeholder={field.placeholder ?? "0.00"}
          keyboardType="decimal-pad"
          maxLength={field.maxLength}
        />
      );
    case "date":
      return (
        <TextField
          label={field.label}
          value={str}
          onChangeText={setStr}
          placeholder={field.placeholder ?? "YYYY-MM-DD"}
          maxLength={10}
          autoCapitalize="none"
        />
      );
    case "password":
      return <PasswordField field={field} value={str} onChange={setStr} colors={colors} />;
    case "switch":
      return (
        <View style={[styles.field, styles.switchRow]}>
          <ThemedText variant="label">{field.label}</ThemedText>
          <Switch
            value={typeof value === "boolean" ? value : str === "true"}
            onValueChange={(v) => onChange(field.name, v)}
            trackColor={{ true: brand[600] }}
          />
        </View>
      );
    case "select":
      return (
        <View style={styles.field}>
          <ThemedText variant="label">{field.label}</ThemedText>
          <View style={styles.chips}>
            {(field.options ?? []).map((o) => {
              const active = str === o;
              return (
                <Pressable
                  key={o}
                  onPress={() => setStr(o)}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: brand[600] }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: active ? "#fff" : colors.text }]}
                  >
                    {o}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    default:
      return (
        <TextField
          label={field.label}
          value={str}
          onChangeText={setStr}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          autoCapitalize={cap}
        />
      );
  }
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: { minHeight: 100 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  passwordWrap: { position: "relative" },
  passwordInput: { paddingRight: 44 },
  eye: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
