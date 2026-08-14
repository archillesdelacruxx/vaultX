import { Stack } from "expo-router";
import React from "react";

import { brand, useThemeColors } from "@/lib/theme";

export default function VaultLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: brand[600],
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
