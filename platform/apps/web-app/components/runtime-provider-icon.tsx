import { cn } from "@repo/ui/lib/utils";
import { Box } from "lucide-react";
import Image from "next/image";

// Official brand logos from each provider's brand assets, served from /public/providers.
// Logos that are black on light backgrounds have a separate dark mode file.
const PROVIDER_LOGOS: Record<
  string,
  { name: string; light: string; dark?: string }
> = {
  aws: {
    name: "AWS",
    light: "/providers/aws.svg",
    dark: "/providers/aws-dark.svg",
  },
  digitalocean: { name: "DigitalOcean", light: "/providers/digitalocean.svg" },
  vercel: {
    name: "Vercel",
    light: "/providers/vercel.svg",
    dark: "/providers/vercel-dark.svg",
  },
  e2b: { name: "E2B", light: "/providers/e2b.svg" },
  daytona: {
    name: "Daytona",
    light: "/providers/daytona.svg",
    dark: "/providers/daytona-dark.svg",
  },
};

export const getRuntimeProviderName = (provider: string) =>
  PROVIDER_LOGOS[provider]?.name ?? provider;

export function RuntimeProviderIcon({
  className,
  provider,
}: {
  className?: string;
  provider: string;
}) {
  const logo = PROVIDER_LOGOS[provider];
  if (!logo) return <Box className={cn("size-5 shrink-0", className)} />;

  const imageClassName = cn("size-5 shrink-0 object-contain", className);
  return (
    <>
      <Image
        src={logo.light}
        alt={logo.name}
        width={20}
        height={20}
        className={cn(imageClassName, logo.dark && "dark:hidden")}
      />
      {logo.dark ? (
        <Image
          src={logo.dark}
          alt={logo.name}
          width={20}
          height={20}
          className={cn(imageClassName, "hidden dark:block")}
        />
      ) : null}
    </>
  );
}
