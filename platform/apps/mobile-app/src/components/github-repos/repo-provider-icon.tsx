import { Image } from "expo-image";

import { useTheme } from "@/hooks/use-theme";

const githubLogo = require("../../../assets/images/github.svg");
const forgejoLogo = require("../../../assets/images/forgejo.svg");

// Brand logo for a repository's Git provider. The GitHub mark follows the text
// color; the Forgejo logo keeps its own colors.
export function RepoProviderIcon({
  size = 16,
  type,
}: {
  size?: number;
  // Older repos have no type and are GitHub.
  type: "github" | "forgejo" | null;
}) {
  const theme = useTheme();
  const isForgejo = type === "forgejo";

  return (
    <Image
      accessibilityLabel={isForgejo ? "Forgejo" : "GitHub"}
      contentFit="contain"
      source={isForgejo ? forgejoLogo : githubLogo}
      style={{ height: size, width: size }}
      tintColor={isForgejo ? undefined : theme.text}
    />
  );
}
