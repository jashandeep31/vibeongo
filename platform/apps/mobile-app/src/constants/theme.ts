import "@/global.css";

import { Platform } from "react-native";

const shared = {
  primary: "#171719",
  primaryForeground: "#ffffff",
  destructive: "#dc3d43",
  warning: "#b45309",
  success: "#16a064",
  brand: "#6d5dfc",
} as const;

export const Colors = {
  light: {
    ...shared,
    text: "#18181b",
    textSecondary: "#71717a",
    background: "#fbfbfc",
    surface: "#ffffff",
    backgroundElement: "#f4f4f5",
    backgroundSelected: "#e8e8eb",
    border: "#e7e7e9",
    input: "#f7f7f8",
    overlay: "rgba(24, 24, 27, 0.44)",
    shadow: "#18181b",
    warningSurface: "#fff7e8",
    destructiveSurface: "#fff0f0",
    successSurface: "#ecfdf5",
  },
  dark: {
    ...shared,
    primary: "#f5f5f5",
    primaryForeground: "#050505",
    text: "#f5f5f5",
    textSecondary: "#9b9b9f",
    background: "#000000",
    surface: "#080808",
    backgroundElement: "#111111",
    backgroundSelected: "#1a1a1a",
    border: "#242424",
    input: "#0d0d0d",
    overlay: "rgba(0, 0, 0, 0.82)",
    shadow: "#000000",
    brand: "#8b7cff",
    warning: "#f5bd45",
    warningSurface: "#1c1608",
    destructive: "#ff7388",
    destructiveSurface: "#200b10",
    success: "#43d99a",
    successSurface: "#092018",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type AppColors = (typeof Colors)["light"] | (typeof Colors)["dark"];

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 14,
  large: 20,
  composer: 28,
  pill: 999,
} as const;

export const TouchTarget = 44;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
