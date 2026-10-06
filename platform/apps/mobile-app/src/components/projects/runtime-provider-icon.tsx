import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

// Official brand logos from each provider's brand assets. Single colour black
// logos follow the text color; AWS has its own dark mode file.
const PROVIDER_LOGOS: Record<
  string,
  { name: string; source: number; darkSource?: number; tint?: boolean }
> = {
  aws: {
    name: "AWS",
    source: require("../../../assets/images/providers/aws.svg"),
    darkSource: require("../../../assets/images/providers/aws-dark.svg"),
  },
  digitalocean: {
    name: "DigitalOcean",
    source: require("../../../assets/images/providers/digitalocean.svg"),
  },
  vercel: {
    name: "Vercel",
    source: require("../../../assets/images/providers/vercel.svg"),
    tint: true,
  },
  e2b: {
    name: "E2B",
    source: require("../../../assets/images/providers/e2b.svg"),
  },
  daytona: {
    name: "Daytona",
    source: require("../../../assets/images/providers/daytona.svg"),
    tint: true,
  },
};

export const getRuntimeProviderName = (provider: string) =>
  PROVIDER_LOGOS[provider]?.name ?? provider;

export function RuntimeProviderIcon({
  provider,
  size = 18,
}: {
  provider: string;
  size?: number;
}) {
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";
  const logo = PROVIDER_LOGOS[provider];

  if (!logo) {
    return (
      <SymbolView
        name={{ ios: "shippingbox", android: "deployed_code" }}
        size={size}
        tintColor={theme.text}
      />
    );
  }

  return (
    <Image
      accessibilityLabel={logo.name}
      contentFit="contain"
      source={isDark && logo.darkSource ? logo.darkSource : logo.source}
      style={{ height: size, width: size }}
      tintColor={logo.tint ? theme.text : undefined}
    />
  );
}
