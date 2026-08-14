import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { ActivityIndicator, StyleSheet, View, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "../global.css";

import { PinLock } from "@/components/pin-lock";
import { brand } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { TrpcProvider } from "@/providers/trpc-provider";

function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={brand[600]} />
    </View>
  );
}

function RootNavigator() {
  const { status, needsPin, pinUnlocked } = useAuth();

  if (status === "loading") return <LoadingView />;

  if (status === "signedOut") {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  if (needsPin && !pinUnlocked) return <PinLock />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <TrpcProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </TrpcProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
