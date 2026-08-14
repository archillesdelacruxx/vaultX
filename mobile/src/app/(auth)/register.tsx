import { Link } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";

import { AuthScreen, Button, TextField } from "@/components/ui";
import { api } from "@/lib/trpc";
import { brand } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";

export default function RegisterScreen() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const register = api.auth.register.useMutation({
    onError: (e) => setError(e.message),
  });

  const submit = async () => {
    setError("");
    try {
      await register.mutateAsync({ name: name.trim(), email: email.trim(), password });
    } catch {
      return;
    }
    const err = await login(email.trim(), password);
    if (err) setError(err);
  };

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Your vault is one step away."
      footer={
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "#94a3b8", fontSize: 14 }}>Already have an account?{" "}</Text>
          <Link href="/login">
            <Text style={{ color: brand[600], fontSize: 14, fontWeight: "700" }}>Sign in</Text>
          </Link>
        </View>
      }
    >
      <TextField
        label="Full name"
        placeholder="Juan Dela Cruz"
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />
      <TextField
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoComplete="email"
      />
      <TextField
        label="Password"
        placeholder="At least 8 characters"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
      />

      {error ? (
        <Text
          style={{
            color: "#dc2626",
            fontSize: 13,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          {error}
        </Text>
      ) : null}

      <Button
        title="Create account"
        onPress={submit}
        loading={register.isPending}
      />
    </AuthScreen>
  );
}
