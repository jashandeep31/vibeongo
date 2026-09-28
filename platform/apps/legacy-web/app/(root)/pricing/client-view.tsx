"use client";

import type { PricingMetadata } from "@/services/instance-metadata-service";
import { formatInternalMoney } from "@repo/shared";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Check, Info, X } from "lucide-react";
import { useState } from "react";

const formatPrice = (amount: number, digits = 4) =>
  `$${formatInternalMoney(amount, digits)}`;

const MANAGEMENT_CHARGE_MULTIPLIER = 1.25;
const ESTIMATED_HOURS_IN_30_DAYS = (8 * 5 * 30) / 7;

export default function PricingClientView({
  data,
}: {
  data: PricingMetadata | null;
}) {
  const [selectedInstanceRegionId, setSelectedInstanceRegionId] = useState("");
  const instanceRegions = data?.instances.map(({ region }) => region) ?? [];
  const activeInstanceRegionId =
    selectedInstanceRegionId || instanceRegions[0]?.id || "";
  const activeInstanceTypes = [
    ...(data?.instances.find(
      ({ region }) => region.id === activeInstanceRegionId,
    )?.types ?? []),
  ].sort((left, right) => left.price_per_hour - right.price_per_hour);

  return (
    <article className="text-foreground mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="text-muted-foreground mt-4 leading-7">
        View VibeOnGo sandbox and virtual machine prices. The 30-day estimates
        assume 8 hours a day, 5 days a week. You pay for compute while your
        workspace is running.
      </p>

      {!data ? (
        <p className="text-destructive mt-10 text-sm">
          Unable to load pricing information.
        </p>
      ) : null}

      {data ? (
        <div className="mt-12 space-y-12">
          <section>
            <h2 className="text-xl font-semibold">Sandboxes</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Disposable workspaces, billed per second. Prices include the
              VibeOnGo management charge.
            </p>
            <PricingOptions
              rows={data.sandboxes
                .flatMap(({ types }) =>
                  types.map((type) => ({
                    id: type.id,
                    name: type.name,
                    provider: type.provider,
                    cpu: type.cpu,
                    ram: type.ram,
                    price: formatPrice(
                      type.price_per_second * MANAGEMENT_CHARGE_MULTIPLIER,
                      7,
                    ),
                    estimatedPrice: formatPrice(
                      type.price_per_second *
                        60 *
                        60 *
                        MANAGEMENT_CHARGE_MULTIPLIER *
                        ESTIMATED_HOURS_IN_30_DAYS,
                      2,
                    ),
                    sortPrice: type.price_per_second,
                  })),
                )
                .sort((left, right) => left.sortPrice - right.sortPrice)}
              unit="second"
              emptyLabel="No sandbox options are available."
            />
          </section>

          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Virtual machines</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  Persistent workspaces, billed per hour. Prices include the
                  VibeOnGo management charge.
                </p>
              </div>
              {instanceRegions.length > 0 ? (
                <label className="text-sm">
                  <span className="text-muted-foreground mb-1 block">
                    Region
                  </span>
                  <select
                    value={activeInstanceRegionId}
                    onChange={(event) =>
                      setSelectedInstanceRegionId(event.target.value)
                    }
                    className="bg-background text-foreground h-9 rounded-md border px-3"
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
              rows={activeInstanceTypes.map((type) => ({
                id: type.id,
                name: type.name,
                provider: type.provider,
                cpu: type.cpu,
                ram: type.ram,
                price: formatPrice(
                  type.price_per_hour * MANAGEMENT_CHARGE_MULTIPLIER,
                ),
                estimatedPrice: formatPrice(
                  type.price_per_hour *
                    MANAGEMENT_CHARGE_MULTIPLIER *
                    ESTIMATED_HOURS_IN_30_DAYS,
                  2,
                ),
              }))}
              unit="hour"
              emptyLabel="No virtual machine options are available."
            />
          </section>
          <IncludedFeatures />
        </div>
      ) : null}
      <PricingFaq />
    </article>
  );
}

type PricingRow = {
  id: string;
  name: string;
  provider: string;
  cpu: string | null;
  ram: string | null;
  price: string;
  estimatedPrice: string;
};

function PricingOptions({
  rows,
  unit,
  emptyLabel,
}: {
  rows: PricingRow[];
  unit: "second" | "hour";
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground mt-6 text-sm">{emptyLabel}</p>;
  }

  return (
    <div className="mt-6">
      <div className="hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground border-y">
            <tr>
              <th className="px-4 py-3 font-medium">Workspace</th>
              <th className="px-4 py-3 text-right font-medium">
                VibeOnGo price / {unit}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                30-day estimate
                <br />
                <span className="font-normal">8h/day · 5d/week</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-4">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {row.provider}
                    {row.cpu || row.ram
                      ? ` · ${[row.cpu, row.ram].filter(Boolean).join(" · ")}`
                      : ""}
                  </p>
                </td>
                <td className="px-4 py-4 text-right font-medium tabular-nums">
                  {row.price}
                </td>
                <td className="px-4 py-4 text-right font-medium tabular-nums">
                  {row.estimatedPrice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-4 sm:hidden">
        {rows.map((row) => (
          <section key={row.id} className="bg-background rounded-md border p-4">
            <h3 className="font-medium">{row.name}</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {row.provider}
              {row.cpu || row.ram
                ? ` · ${[row.cpu, row.ram].filter(Boolean).join(" · ")}`
                : ""}
            </p>
            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">VibeOnGo price: </span>
              <span className="font-medium tabular-nums">
                {row.price}/{unit}
              </span>
            </p>
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">
                30-day estimate (8h/day · 5d/week):{" "}
              </span>
              <span className="font-medium tabular-nums">
                {row.estimatedPrice}
              </span>
            </p>
          </section>
        ))}
      </div>
    </div>
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
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        Compare a standard always-on provider VM with the VibeOnGo platform.
      </p>
      <div className="mt-6 hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground border-y">
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
                <td className="text-muted-foreground px-4 py-4 text-center">
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
              <span className="text-muted-foreground flex items-center gap-1.5">
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
          These prices and estimates cover base compute only. Network-usage
          charges are added based on how much network data your workspace uses.
        </AlertDescription>
      </Alert>
    </section>
  );
}

function PricingFaq() {
  const questions = [
    {
      question: "How does VibeOnGo pricing work?",
      answer:
        "Sandboxes are billed per second and virtual machines are billed per hour. The 30-day estimates assume 8 hours a day, 5 days a week. Prices include the VibeOnGo management charge.",
    },
    {
      question:
        "What is the difference between a virtual machine and a sandbox?",
      answer:
        "Virtual machines are persistent workspaces for ongoing development. Sandboxes are disposable, isolated workspaces for short-lived or automated tasks.",
    },
    {
      question: "Are network charges included in the prices?",
      answer:
        "No. Prices and estimates cover base compute. Network-usage charges depend on how much data your workspace transfers.",
    },
  ];

  return (
    <section className="mt-12 border-t pt-10" aria-labelledby="pricing-faq">
      <h2 id="pricing-faq" className="text-xl font-semibold">
        Pricing FAQ
      </h2>
      <dl className="mt-6 space-y-6">
        {questions.map(({ question, answer }) => (
          <div key={question}>
            <dt className="font-medium">{question}</dt>
            <dd className="text-muted-foreground mt-2 text-sm leading-6">
              {answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
