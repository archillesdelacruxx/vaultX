import { Link } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";

import { AuthScreen, Button, TextField } from "@/components/ui";
import { api } from "@/lib/trpc";
import { brand } from "@/lib/theme";

export default function ResetPasswordScreen() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const reset = api.auth.resetPassword.useMutation({
    onError: (e) => setError(e.message),
    onSuccess: () => setDone(true),
  });

  const submit = () => {
    setError("");
    reset.mutate({ token: token.trim(), password });
  };

  if (done) {
    return (
      <AuthScreen
        title="Password updated"
        subtitle="You can now sign in with your new password."
        footer={
          <Link href="/login">
            <Text style={{ color: brand[600], fontSize: 14, fontWeight: "700" }}>
              Go to sign in
            </Text>
          </Link>
        }
      />
    );
  }

  return (
    <AuthScreen
      title="Set a new password"
      subtitle="Paste the token from your reset link and choose a new password."
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
        label="Reset token"
        placeholder="Paste the token from the link"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
      />
      <TextField
        label="New password"
        placeholder="At least 8 characters"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
      />

      {error ? (
        <Text style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
          {error}
        </Text>
      ) : null}

      <Button title="Reset password" onPress={submit} loading={reset.isPending} />
    </AuthScreen>
  );
}
