import { memo, useEffect, useMemo, useState } from "react";
import { sandboxProvidersEnums } from "@repo/db";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import {
  useSandboxRegions,
  useSandboxTypesByRegionId,
} from "@/hooks/use-instance-metadata";
import { useConfigStore } from "@/store/config-store";
import { Box, Container, Cpu, Sparkles, Triangle } from "lucide-react";
import { formatInternalMoney } from "@repo/shared";

const formatPricePerSecond = (pricePerSecond: number) =>
  `$${formatInternalMoney(pricePerSecond)}/sec`;

type SandboxProvider = (typeof sandboxProvidersEnums.enumValues)[number];

const sandboxProviderOptions: {
  id: SandboxProvider;
  name: string;
  description: string;
  recommended: boolean;
  available: boolean;
  Icon: typeof Box;
}[] = [
  {
    id: "e2b",
    name: "E2B",
    description: "Use E2B as the sandbox runtime.",
    recommended: true,
    available: true,
    Icon: Box,
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Use Vercel as the sandbox runtime.",
    recommended: false,
    available: true,
    Icon: Triangle,
  },
  {
    id: "daytona",
    name: "Daytona",
    description: "Use Daytona as the sandbox runtime.",
    recommended: false,
    available: false,
    Icon: Container,
  },
];

const isSandboxProviderAvailable = (provider: SandboxProvider | ""): boolean =>
  provider === "e2b" || provider === "vercel";

function SandboxConfigCard() {
  const {
    sandboxRegionId,
    sandboxTypeId,
    setSandboxRegionId,
    setSandboxTypeId,
  } = useConfigStore();
  const [sandboxProvider, setSandboxProvider] = useState<SandboxProvider | "">(
    "",
  );
  const { data: sandboxRegions, isLoading: isRegionsLoading } =
    useSandboxRegions();
  const { data: sandboxTypes, isLoading: isTypesLoading } =
    useSandboxTypesByRegionId({ regionId: sandboxRegionId || null });

  const providers = useMemo(
    () =>
      Array.from(
        new Set(sandboxRegions?.map((region) => region.provider) ?? []),
      ),
    [sandboxRegions],
  );
  const providerRegions = useMemo(
    () =>
      sandboxRegions?.filter(
        (region) => !sandboxProvider || region.provider === sandboxProvider,
      ),
    [sandboxProvider, sandboxRegions],
  );

  // The edit form hydrates the region id before metadata may have loaded.
  // Derive the selected provider once that metadata is available.
  useEffect(() => {
    const selectedRegion = sandboxRegions?.find(
      (region) => region.id === sandboxRegionId,
    );
    if (selectedRegion) setSandboxProvider(selectedRegion.provider);
  }, [sandboxRegionId, sandboxRegions]);

  const selectProvider = (provider: SandboxProvider) => {
    if (!isSandboxProviderAvailable(provider)) return;
    if (sandboxProvider === provider) return;

    setSandboxProvider(provider);
    setSandboxRegionId("");
    setSandboxTypeId("");
  };

  const selectRegion = (regionId: string) => {
    const region = sandboxRegions?.find((item) => item.id === regionId);
    if (region) setSandboxProvider(region.provider);
    setSandboxRegionId(regionId);
    setSandboxTypeId("");
  };

  return (
    <section className="border-border space-y-3 border-t pt-4">
      <Label className="text-sm">Sandbox</Label>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Provider</Label>
        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          {isRegionsLoading ? (
            [1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-9 w-28" />
            ))
          ) : (
            <TooltipProvider>
              {sandboxProviderOptions
                .filter((option) => providers.includes(option.id))
                .map(
                  ({ id, name, description, recommended, available, Icon }) => (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`${name}${
                            available ? "" : " (coming soon)"
                          }`}
                          aria-pressed={sandboxProvider === id}
                          disabled={!available}
                          onClick={() => selectProvider(id)}
                          className={`relative h-9 min-w-28 justify-start gap-2 px-3 ${
                            sandboxProvider === id
                              ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                              : recommended
                                ? "border-amber-300/80 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/5"
                                : ""
                          }`}
                        >
                          {recommended ? (
                            <Badge
                              variant="outline"
                              className="absolute -top-2 right-1 h-4 border-amber-300 bg-amber-100 px-1.5 text-[9px] leading-none text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                            >
                              <Sparkles />
                              Recommended
                            </Badge>
                          ) : null}
                          {!available ? (
                            <Badge
                              variant="secondary"
                              className="absolute -top-2 right-1 h-4 px-1.5 text-[9px] leading-none shadow-sm"
                            >
                              Coming soon
                            </Badge>
                          ) : null}
                          <Icon className="size-4" />
                          {name}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {description}
                        {!available ? " Coming soon." : ""}
                      </TooltipContent>
                    </Tooltip>
                  ),
                )}
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Region</Label>
        <div className="flex flex-wrap items-center gap-2">
          {isRegionsLoading ? (
            [1, 2].map((index) => <Skeleton key={index} className="h-7 w-28" />)
          ) : (
            <TooltipProvider>
              {providerRegions?.map((region) => (
                <Tooltip key={region.id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={sandboxRegionId === region.id}
                      disabled={!isSandboxProviderAvailable(region.provider)}
                      onClick={() => selectRegion(region.id)}
                      className={
                        sandboxRegionId === region.id
                          ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                          : ""
                      }
                    >
                      {region.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{region.slug}</TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          )}
        </div>
      </div>

      {sandboxRegionId ? (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Machine type</Label>
          <div className="flex flex-wrap gap-2">
            {isTypesLoading ? (
              [1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-12 w-52 rounded-lg" />
              ))
            ) : (
              <TooltipProvider>
                {sandboxTypes?.map((sandboxType) => (
                  <Tooltip key={sandboxType.id}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        aria-pressed={sandboxTypeId === sandboxType.id}
                        disabled={!isSandboxProviderAvailable(sandboxProvider)}
                        onClick={() => setSandboxTypeId(sandboxType.id)}
                        className={`h-12 min-w-52 justify-start gap-2 px-3 text-left ${
                          sandboxTypeId === sandboxType.id
                            ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                            : ""
                        }`}
                      >
                        <Cpu className="size-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate">
                            {sandboxType.name}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-[10px] font-normal">
                            {sandboxType.cpu || "N/A"} ·{" "}
                            {sandboxType.ram || "N/A"} ·{" "}
                            {formatPricePerSecond(
                              sandboxType.price_per_seconds,
                            )}
                          </span>
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-72">
                      <span className="flex flex-col gap-1">
                        {sandboxType.description ? (
                          <span>{sandboxType.description}</span>
                        ) : null}
                        <span className="text-background/70">
                          Billed at{" "}
                          {formatPricePerSecond(sandboxType.price_per_seconds)}.
                        </span>
                      </span>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default memo(SandboxConfigCard);
