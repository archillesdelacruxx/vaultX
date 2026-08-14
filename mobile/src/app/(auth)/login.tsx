import { Link } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";

import { AuthScreen, Button, TextField } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";
import { brand } from "@/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    const err = await login(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to access your vault"
      footer={
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "#94a3b8", fontSize: 14 }}>
            Don&apos;t have an account?{" "}
          </Text>
          <Link href="/register">
            <Text style={{ color: brand[600], fontSize: 14, fontWeight: "700" }}>
              Create one
            </Text>
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
      <TextField
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
      />
      <View style={{ alignItems: "flex-end", marginBottom: 20 }}>
        <Link href="/forgot-password">
          <Text style={{ color: brand[600], fontSize: 13, fontWeight: "600" }}>
            Forgot password?
          </Text>
        </Link>
      </View>

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

      <Button title="Sign in" onPress={submit} loading={loading} />
    </AuthScreen>
  );
}
