import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useIsDark, brand, useThemeColors } from "@/lib/theme";

interface TabBarRoute {
  key: string;
  name: string;
  params?: object | undefined;
}

interface TabBarProps {
  state: { index: number; routes: TabBarRoute[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: unknown;
}

interface TabNavigation {
  emit: (event: {
    type: "tabPress";
    target: string;
    canPreventDefault: boolean;
  }) => { defaultPrevented?: boolean };
  navigate: (name: string, params?: object) => void;
}

const TABS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }> = {
  dashboard: { label: "Home", icon: "home-outline", activeIcon: "home" },
  vault: { label: "Vault", icon: "shield-checkmark-outline", activeIcon: "shield-checkmark" },
  finance: { label: "Finance", icon: "wallet-outline", activeIcon: "wallet" },
  productivity: { label: "Productivity", icon: "checkmark-done-outline", activeIcon: "checkmark-done" },
  ai: { label: "AI", icon: "sparkles-outline", activeIcon: "sparkles" },
  settings: { label: "Settings", icon: "settings-outline", activeIcon: "settings" },
};

export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const nav = navigation as TabNavigation;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        style={[
          styles.island,
          {
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            borderColor: colors.border,
            shadowColor: "#000",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options;
          const label =
            options?.title ??
            TABS[route.name]?.label ??
            route.name.replace(/-/g, " ");
          const icon = TABS[route.name];
          const focused = state.index === index;

          const onPress = () => {
            const event = nav.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              nav.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                pressed && { opacity: 0.7 },
                focused && { backgroundColor: brand[600] + "1a" },
              ]}
            >
              <Ionicons
                name={focused && icon ? icon.activeIcon : icon?.icon ?? "ellipse-outline"}
                size={22}
                color={focused ? brand[600] : colors.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: focused ? brand[600] : colors.textMuted,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: "center",
  },
  island: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 16,
    elevation: 12,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    minWidth: 56,
  },
  label: { fontSize: 10, fontWeight: "600", marginTop: 2 },
});
