import { useColorScheme } from "react-native";

export const brand = {
  50: "#eef5ff",
  100: "#d9e8ff",
  200: "#bcd7ff",
  300: "#8ebdff",
  400: "#5997ff",
  500: "#3371fc",
  600: "#1d50f1",
  700: "#153dde",
  800: "#1833b4",
  900: "#19318d",
  950: "#131e56",
};

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
}

export const lightColors: ThemeColors = {
  background: "#f6f8fb",
  surface: "#ffffff",
  card: "#ffffff",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  danger: "#dc2626",
  success: "#059669",
};

export const darkColors: ThemeColors = {
  background: "#0b1220",
  surface: "#0f172a",
  card: "#0f172a",
  text: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "#1e293b",
  danger: "#ef4444",
  success: "#10b981",
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}

export function useIsDark(): boolean {
  return useColorScheme() === "dark";
}
