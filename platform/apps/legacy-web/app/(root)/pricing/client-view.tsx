"use client";

import { usePricingMetadata } from "@/hooks/use-instance-metadata";
import { formatInternalMoney } from "@repo/shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Area,
  AreaChart,
  CartesianGrid,
  type ChartConfig,
  XAxis,
  YAxis,
} from "@repo/ui/components/chart";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Check, Info, X } from "lucide-react";
import { useState } from "react";

const formatPrice = (amount: number, digits = 4) =>
  `$${formatInternalMoney(amount, digits)}`;

const HOURS_IN_30_DAYS = 24 * 30;
const DAYS_IN_COMPARISON = 30;
const MANAGEMENT_CHARGE_MULTIPLIER = 1.25;

const trialChartConfig = {
  withoutVibeOnGo: {
    label: "Without VibeOnGo",
    color: "var(--destructive)",
  },
  withVibeOnGo: {
    label: "With VibeOnGo",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export default function PricingClientView() {
  const { data, isError, isLoading } = usePricingMetadata();
  const [selectedInstanceRegionId, setSelectedInstanceRegionId] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const instanceRegions = data?.instances.map(({ region }) => region) ?? [];
  const activeInstanceRegionId =
    selectedInstanceRegionId || instanceRegions[0]?.id || "";
  const activeInstanceTypes =
    data?.instances.find(
      ({ region }) => region.id === activeInstanceRegionId,
    )?.types ?? [];
  const [selectedEstimateTypeId, setSelectedEstimateTypeId] = useState("");
  const selectedEstimateType =
    activeInstanceTypes.find((type) => type.id === selectedEstimateTypeId) ??
    activeInstanceTypes[0];
  const vibeOnGoHoursInComparison =
    (hoursPerDay * daysPerWeek * DAYS_IN_COMPARISON) / 7;
  const vibeOnGoLabel = `${hoursPerDay}h/day · ${daysPerWeek}d/week`;

  return (
    <article className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-16 text-foreground sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Compare the cost of leaving a workspace running for 30 days with using
        VibeOnGo on your own schedule. VibeOnGo lets you stop workspaces when
        you are not using them, including overnight and on weekends.
      </p>

      <section className="mt-8">
        <h2 className="font-medium">Your usage assumptions</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <UsageStepper
            label="Hours per day"
            value={hoursPerDay}
            min={1}
            max={24}
            onChange={setHoursPerDay}
          />
          <UsageStepper
            label="Days per week"
            value={daysPerWeek}
            min={1}
            max={7}
            onChange={setDaysPerWeek}
          />
        </div>
        <hr className="mt-8 border-border" />
      </section>

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
                  estimate uses your selected schedule for 30 days.
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
                      hourlyPrice: formatPrice(
                        type.price_per_hour * MANAGEMENT_CHARGE_MULTIPLIER,
                      ),
                      alwaysOnPrice: formatPrice(
                        type.price_per_hour * HOURS_IN_30_DAYS,
                      ),
                      vibeOnGoPrice: formatPrice(
                        type.price_per_hour *
                          MANAGEMENT_CHARGE_MULTIPLIER *
                          vibeOnGoHoursInComparison,
                      ),
                    }))
                  : [],
              )}
              emptyLabel="No virtual machine options are available."
              vibeOnGoLabel={vibeOnGoLabel}
            />
            {selectedEstimateType ? (
              <TrialCostChart
                instanceName={selectedEstimateType.name}
                providerHourlyPrice={selectedEstimateType.price_per_hour}
                hoursPerDay={hoursPerDay}
                daysPerWeek={daysPerWeek}
                instanceTypes={activeInstanceTypes.map((type) => ({
                  id: type.id,
                  name: type.name,
                }))}
                selectedTypeId={selectedEstimateType.id}
                onTypeChange={setSelectedEstimateTypeId}
              />
            ) : null}
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
                  hourlyPrice: formatPrice(
                    type.price_per_second *
                      60 *
                      60 *
                      MANAGEMENT_CHARGE_MULTIPLIER,
                  ),
                  alwaysOnPrice: formatPrice(
                    type.price_per_second * 60 * 60 * HOURS_IN_30_DAYS,
                  ),
                  vibeOnGoPrice: formatPrice(
                    type.price_per_second *
                      60 *
                      60 *
                      MANAGEMENT_CHARGE_MULTIPLIER *
                      vibeOnGoHoursInComparison,
                  ),
                })),
              )}
              emptyLabel="No sandbox options are available."
              vibeOnGoLabel={vibeOnGoLabel}
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

function UsageStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="rounded-full text-lg"
        >
          −
        </Button>
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (Number.isFinite(nextValue)) {
              onChange(Math.min(max, Math.max(min, nextValue)));
            }
          }}
          className="mx-3 h-9 w-16 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="rounded-full text-lg"
        >
          +
        </Button>
      </div>
    </div>
  );
}

function TrialCostChart({
  instanceName,
  providerHourlyPrice,
  hoursPerDay,
  daysPerWeek,
  instanceTypes,
  selectedTypeId,
  onTypeChange,
}: {
  instanceName: string;
  providerHourlyPrice: number;
  hoursPerDay: number;
  daysPerWeek: number;
  instanceTypes: Array<{ id: string; name: string }>;
  selectedTypeId: string;
  onTypeChange: (id: string) => void;
}) {
  const chartData = Array.from({ length: DAYS_IN_COMPARISON }, (_, index) => {
    const day = index + 1;
    return {
      day,
      withoutVibeOnGo: Number(
        formatInternalMoney(providerHourlyPrice * day * 24, 2),
      ),
      withVibeOnGo: Number(
        formatInternalMoney(
          providerHourlyPrice *
            MANAGEMENT_CHARGE_MULTIPLIER *
            day *
            hoursPerDay *
            (daysPerWeek / 7),
          2,
        ),
      ),
    };
  });

  return (
    <section className="mt-10 border-t pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold">30-day trial cost comparison</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Cumulative cost for {instanceName}: 24 hours/day versus {hoursPerDay}
            {" "}hours/day, {daysPerWeek} days/week.
          </p>
        </div>
        {instanceTypes.length > 1 ? (
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Instance type</span>
            <select
              value={selectedTypeId}
              onChange={(event) => onTypeChange(event.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-foreground"
            >
              {instanceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <ChartContainer
        config={trialChartConfig}
        className="mt-6 h-72 w-full aspect-auto"
      >
        <AreaChart data={chartData} margin={{ left: 6, right: 6, top: 8 }}>
          <defs>
            <linearGradient id="fill-without-vibeongo" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--color-withoutVibeOnGo)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-withoutVibeOnGo)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fill-with-vibeongo" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--color-withVibeOnGo)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-withVibeOnGo)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `$${value}`}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `Day ${value}`}
                formatter={(value, name) => (
                  <div className="flex flex-1 justify-between gap-6">
                    <span className="text-muted-foreground">
                      {name === "withoutVibeOnGo"
                        ? "Without VibeOnGo"
                        : "With VibeOnGo"}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      ${Number(value).toFixed(2)}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            dataKey="withoutVibeOnGo"
            type="natural"
            fill="url(#fill-without-vibeongo)"
            fillOpacity={1}
            stroke="var(--color-withoutVibeOnGo)"
          />
          <Area
            dataKey="withVibeOnGo"
            type="natural"
            fill="url(#fill-with-vibeongo)"
            fillOpacity={1}
            stroke="var(--color-withVibeOnGo)"
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}

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
      <Alert className="mt-6">
        <Info />
        <AlertTitle>Network usage is separate</AlertTitle>
        <AlertDescription>
          These estimates cover base compute only. Network-usage charges are
          added based on how much network data your workspace uses.
        </AlertDescription>
      </Alert>
    </section>
  );
}

function PricingOptions({
  rows,
  emptyLabel,
  vibeOnGoLabel,
}: {
  rows: PricingRow[];
  emptyLabel: string;
  vibeOnGoLabel: string;
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
              <th className="px-4 py-3 text-right font-medium">
                Hourly price
                <br />
                <span className="font-normal">Includes management charge</span>
              </th>
              <th className="bg-red-500/5 px-4 py-3 text-right font-medium text-red-600">
                Without VibeOnGo<br />
                <span className="font-normal">Running for 30 days</span>
              </th>
              <th className="px-4 py-3 text-right font-medium">
                With VibeOnGo<br />
                <span className="font-normal">{vibeOnGoLabel}</span>
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
                label={`With VibeOnGo · ${vibeOnGoLabel}`}
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
