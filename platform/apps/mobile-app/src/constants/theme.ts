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
    primary: "#f4f4f5",
    primaryForeground: "#18181b",
    text: "#f4f4f5",
    textSecondary: "#a1a1aa",
    background: "#151516",
    surface: "#1c1c1f",
    backgroundElement: "#27272a",
    backgroundSelected: "#35353a",
    border: "#303034",
    input: "#242427",
    overlay: "rgba(0, 0, 0, 0.66)",
    shadow: "#000000",
    warning: "#fbbf24",
    warningSurface: "#302610",
    destructive: "#fb7185",
    destructiveSurface: "#331b20",
    success: "#34d399",
    successSurface: "#123126",
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
