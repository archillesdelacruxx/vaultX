import { Link } from "expo-router";
import React, { useState } from "react";
import { Linking, Text, View } from "react-native";

import { AuthScreen, Button, TextField } from "@/components/ui";
import { api } from "@/lib/trpc";
import { brand } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const forgot = api.auth.forgotPassword.useMutation({
    onError: (e) => setError(e.message),
    onSuccess: (res) => setResetUrl(res.resetUrl),
  });

  const submit = () => {
    setError("");
    setResetUrl(null);
    forgot.mutate({ email: email.trim() });
  };

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="We'll generate a reset link for you."
      footer={
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "#94a3b8", fontSize: 14 }}>Remembered it?{" "}</Text>
          <Link href="/login">
            <Text style={{ color: brand[600], fontSize: 14, fontWeight: "700" }}>Sign in</Text>
          </Link>
        </View>
      }
    >
      <TextField
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoComplete="email"
      />

      {error ? (
        <Text style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
          {error}
        </Text>
      ) : null}

      {resetUrl ? (
        <View
          style={{
            backgroundColor: "#ecfdf5",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#065f46", fontSize: 13, marginBottom: 8 }}>
            Reset link created (no email server is configured, so here it is directly):
          </Text>
          <Text style={{ color: "#047857", fontSize: 12 }} selectable>
            {resetUrl}
          </Text>
          <Button
            title="Open reset link"
            onPress={() => Linking.openURL(resetUrl)}
            style={{ marginTop: 10 }}
          />
        </View>
      ) : (
        <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
          No email server is set up, so the reset link will be shown here.
        </Text>
      )}

      <Button title="Request reset link" onPress={submit} loading={forgot.isPending} />
    </AuthScreen>
  );
}
