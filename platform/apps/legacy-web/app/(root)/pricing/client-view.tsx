"use client";

import { usePricingMetadata } from "@/hooks/use-instance-metadata";
import { formatInternalMoney } from "@repo/shared";
import { Check, X } from "lucide-react";
import { useState } from "react";

const formatPrice = (amount: number, digits = 4) =>
  `$${formatInternalMoney(amount, digits)}`;

const HOURS_IN_30_DAYS = 24 * 30;
const VIBEONGO_HOURS_IN_30_DAYS = 8 * 30;

export default function PricingClientView() {
  const { data, isError, isLoading } = usePricingMetadata();
  const [selectedInstanceRegionId, setSelectedInstanceRegionId] = useState("");
  const instanceRegions = data?.instances.map(({ region }) => region) ?? [];
  const activeInstanceRegionId =
    selectedInstanceRegionId || instanceRegions[0]?.id || "";

  return (
    <article className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-16 text-foreground sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Compare the cost of leaving a workspace running for 30 days with using
        VibeOnGo for 8 hours each day. VibeOnGo lets you stop workspaces when
        you are not using them, including overnight and on weekends.
      </p>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading prices…</p>
      ) : null}

      {isError ? (
        <p className="mt-10 text-sm text-destructive">
          Unable to load pricing information.
        </p>
      ) : null}

      {data ? (
        <div className="mt-12 space-y-12">
          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Virtual machines</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Persistent workspaces, billed per hour. The monthly VibeOnGo
                  estimate assumes 8 hours of use per day for 30 days.
                </p>
              </div>
              {instanceRegions.length > 0 ? (
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Region</span>
                  <select
                    value={activeInstanceRegionId}
                    onChange={(event) =>
                      setSelectedInstanceRegionId(event.target.value)
                    }
                    className="h-9 rounded-md border bg-background px-3 text-foreground"
                  >
                    {instanceRegions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.provider} · {region.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <PricingOptions
              rows={data.instances.flatMap(({ region, types }) =>
                region.id === activeInstanceRegionId
                  ? types.map((type) => ({
                      id: type.id,
                      name: type.name,
                      provider: type.provider,
                      cpu: type.cpu,
                      ram: type.ram,
                      hourlyPrice: formatPrice(type.price_per_hour),
                      alwaysOnPrice: formatPrice(
                        type.price_per_hour * HOURS_IN_30_DAYS,
                      ),
                      vibeOnGoPrice: formatPrice(
                        type.price_per_hour * VIBEONGO_HOURS_IN_30_DAYS,
                      ),
                    }))
                  : [],
              )}
              emptyLabel="No virtual machine options are available."
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold">Sandboxes</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Disposable workspaces, billed per second. An hourly equivalent is
              used for the 30-day estimates below.
            </p>
            <PricingOptions
              rows={data.sandboxes.flatMap(({ types }) =>
                types.map((type) => ({
                  id: type.id,
                  name: type.name,
                  provider: type.provider,
                  cpu: type.cpu,
                  ram: type.ram,
                  hourlyPrice: formatPrice(type.price_per_second * 60 * 60),
                  alwaysOnPrice: formatPrice(
                    type.price_per_second * 60 * 60 * HOURS_IN_30_DAYS,
                  ),
                  vibeOnGoPrice: formatPrice(
                    type.price_per_second *
                      60 *
                      60 *
                      VIBEONGO_HOURS_IN_30_DAYS,
                  ),
                })),
              )}
              emptyLabel="No sandbox options are available."
            />
          </section>
          <IncludedFeatures />
        </div>
      ) : null}
    </article>
  );
}

type PricingRow = {
  id: string;
  name: string;
  provider: string;
  cpu: string | null;
  ram: string | null;
  hourlyPrice: string;
  alwaysOnPrice: string;
  vibeOnGoPrice: string;
};

function IncludedFeatures() {
  const features = [
    {
      feature: "Automatic pull-request review",
    },
    {
      feature: "Automatic issue review and fixing",
    },
    {
      feature: "Fresh isolated environment for automated work",
    },
    {
      feature: "Live HTTPS preview URLs",
    },
    {
      feature: "Parallel workspace execution (tier-limited)",
    },
    {
      feature: "Automatic workspace expiration",
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-semibold">Included platform features</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Compare a standard always-on provider VM with the VibeOnGo platform.
      </p>
      <div className="mt-6 hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-y text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Feature</th>
              <th className="px-4 py-3 text-center font-medium">
                Without VibeOnGo
              </th>
              <th className="px-4 py-3 text-center font-medium">
                With VibeOnGo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {features.map((feature) => (
              <tr key={feature.feature}>
                <td className="px-4 py-4 font-medium">{feature.feature}</td>
                <td className="px-4 py-4 text-center text-muted-foreground">
                  <X className="mx-auto size-4" aria-label="Not included" />
                </td>
                <td className="px-4 py-4 text-center text-emerald-600">
                  <Check className="mx-auto size-4" aria-label="Included" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-6 space-y-4 sm:hidden">
        {features.map((feature) => (
          <div key={feature.feature} className="border-b pb-4">
            <dt className="font-medium">{feature.feature}</dt>
            <dd className="mt-2 flex items-center gap-5 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <X className="size-4" /> Without
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <Check className="size-4" /> With VibeOnGo
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        Automatic expiration uses your configured time limit. This comparison
        does not claim malware protection or a dedicated test environment,
        because those are not separate VibeOnGo features today.
      </p>
    </section>
  );
}

function PricingOptions({
  rows,
  emptyLabel,
}: {
  rows: PricingRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="mt-6">
      <div className="hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-y text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Workspace</th>
              <th className="px-4 py-3 text-right font-medium">Hourly price</th>
              <th className="bg-red-500/5 px-4 py-3 text-right font-medium text-red-600">
                Without VibeOnGo<br />
                <span className="font-normal">Running for 30 days</span>
              </th>
              <th className="px-4 py-3 text-right font-medium">
                With VibeOnGo<br />
                <span className="font-normal">8 hours/day for 30 days</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-4">
                  <p className="font-medium">{row.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.provider}
                    {row.cpu || row.ram
                      ? ` · ${[row.cpu, row.ram].filter(Boolean).join(" · ")}`
                      : ""}
                  </p>
                </td>
                <td className="px-4 py-4 text-right tabular-nums">
                  {row.hourlyPrice}
                </td>
                <td className="bg-red-500/5 px-4 py-4 text-right font-medium tabular-nums text-red-600">
                  {row.alwaysOnPrice}
                </td>
                <td className="px-4 py-4 text-right font-medium tabular-nums">
                  {row.vibeOnGoPrice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 sm:hidden">
        {rows.map((row) => (
          <section key={row.id} className="rounded-md border bg-background p-4">
            <h3 className="font-medium">{row.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.provider}
              {row.cpu || row.ram
                ? ` · ${[row.cpu, row.ram].filter(Boolean).join(" · ")}`
                : ""}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <ComparisonLine label="Hourly price" price={row.hourlyPrice} />
              <ComparisonLine
                label="Without VibeOnGo · running for 30 days"
                price={row.alwaysOnPrice}
                tone="warning"
              />
              <ComparisonLine
                label="With VibeOnGo · 8 hours/day for 30 days"
                price={row.vibeOnGoPrice}
                tone="default"
              />
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

function ComparisonLine({
  label,
  price,
  tone = "plain",
}: {
  label: string;
  price: string;
  tone?: "plain" | "warning" | "default";
}) {
  const classes =
    tone === "warning"
      ? "border-red-500/15 bg-red-500/5 text-red-600"
      : tone === "default"
        ? "border-border bg-muted/30"
        : "border-border bg-muted/30";

  return (
    <div className={`flex items-center justify-between gap-4 rounded-md border p-3 ${classes}`}>
      <dt className="text-xs leading-5 opacity-70">{label}</dt>
      <dd className="shrink-0 font-medium tabular-nums">{price}</dd>
    </div>
  );
}
