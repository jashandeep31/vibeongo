import { memo, useEffect, useMemo, useState } from "react";
import { sandboxProvidersEnums } from "@repo/db";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  useSandboxRegions,
  useSandboxTypesByRegionId,
} from "@/hooks/use-instance-metadata";
import { useConfigStore } from "@/store/config-store";

const formatPricePerSecond = (pricePerSecond: number) =>
  `$${(pricePerSecond / 10_000_000).toFixed(4)}/sec`;

type SandboxProvider = (typeof sandboxProvidersEnums.enumValues)[number];

const providerNames: Record<SandboxProvider, string> = {
  e2b: "E2B",
  vercel: "Vercel",
  daytona: "Daytona",
};

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

  useEffect(() => {
    const selectedRegion = sandboxRegions?.find(
      (region) => region.id === sandboxRegionId,
    );
    if (selectedRegion) setSandboxProvider(selectedRegion.provider);
  }, [sandboxRegionId, sandboxRegions]);

  const selectProvider = (provider: SandboxProvider) => {
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
    <section className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label className="text-sm">Sandbox configuration</Label>
        <p className="text-muted-foreground text-sm">
          Choose the sandbox environment for this project.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">
          Sandbox provider
        </Label>
        <div className="flex flex-wrap items-center gap-3">
          {isRegionsLoading
            ? [1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-10 w-24" />
              ))
            : providers.map((provider) => (
                <button
                  type="button"
                  onClick={() => selectProvider(provider)}
                  className={`hover:border-primary rounded-md border px-4 py-2 text-sm transition-colors ${
                    sandboxProvider === provider
                      ? "border-primary bg-primary/5 text-primary ring-primary ring-1"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                  key={provider}
                >
                  {providerNames[provider]}
                </button>
              ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Sandbox region</Label>
        <div className="flex flex-wrap items-center gap-3">
          {isRegionsLoading
            ? [1, 2].map((index) => (
                <Skeleton key={index} className="h-12 w-28" />
              ))
            : providerRegions?.map((region) => (
                <button
                  type="button"
                  onClick={() => selectRegion(region.id)}
                  className={`hover:border-primary rounded-md border p-2 text-left text-sm transition-colors ${
                    sandboxRegionId === region.id
                      ? "border-primary bg-primary/5 text-primary ring-primary ring-1"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                  key={region.id}
                >
                  {region.name}
                  <span className="text-muted-foreground block text-xs">
                    {region.slug}
                  </span>
                </button>
              ))}
        </div>
      </div>

      {sandboxRegionId ? (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Sandbox type</Label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {isTypesLoading
              ? [1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))
              : sandboxTypes?.map((sandboxType) => (
                  <button
                    type="button"
                    onClick={() => setSandboxTypeId(sandboxType.id)}
                    className={`hover:border-primary flex min-h-32 flex-col rounded-lg border p-4 text-left transition-colors ${
                      sandboxTypeId === sandboxType.id
                        ? "border-primary bg-primary/5 ring-primary ring-1"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    key={sandboxType.id}
                  >
                    <span className="font-medium">{sandboxType.name}</span>
                    {sandboxType.description ? (
                      <span className="text-muted-foreground mt-1 text-xs">
                        {sandboxType.description}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground mt-auto grid grid-cols-3 gap-2 pt-4 text-xs">
                      <span>
                        Price
                        <br />
                        {formatPricePerSecond(sandboxType.price_per_seconds)}
                      </span>
                      <span>
                        CPU
                        <br />
                        {sandboxType.cpu || "N/A"}
                      </span>
                      <span>
                        RAM
                        <br />
                        {sandboxType.ram || "N/A"}
                      </span>
                    </span>
                  </button>
                ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default memo(SandboxConfigCard);
