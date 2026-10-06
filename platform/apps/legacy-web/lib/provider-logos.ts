/**
 * Official provider marks, downloaded from each company's own site into
 * public/assets/providers. Keyed by the `provider` value stored on regions/types.
 */
export const PROVIDER_LOGOS: Record<
  string,
  {
    label: string;
    src: string;
    /** Transparent marks need a light tile behind them; full-bleed icons don't. */
    tile: "full" | "light";
  }
> = {
  aws: { label: "AWS", src: "/assets/providers/aws.png", tile: "full" },
  boat: { label: "Boat", src: "/assets/providers/boat.svg", tile: "light" },
  daytona: {
    label: "Daytona",
    src: "/assets/providers/daytona.png",
    tile: "light",
  },
  e2b: { label: "E2B", src: "/assets/providers/e2b.png", tile: "full" },
  vercel: {
    label: "Vercel",
    src: "/assets/providers/vercel.png",
    tile: "full",
  },
};

export const getProviderLogo = (provider: string) =>
  PROVIDER_LOGOS[provider.toLowerCase()];
