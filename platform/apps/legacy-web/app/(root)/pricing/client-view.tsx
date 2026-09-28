"use client";

import type { PricingMetadata } from "@/services/instance-metadata-service";
import { ClosingCta } from "@/components/landing-page/closing-cta";
import { getAppUrl } from "@/lib/app-url";
import { getProviderLogo } from "@/lib/provider-logos";
import { InView } from "@/components/landing-page/in-view";
import { formatInternalMoney, INTERNAL_MONEY_SCALE } from "@repo/shared";
import {
  ArrowRight,
  Box,
  Check,
  Cpu,
  Info,
  MemoryStick,
  Plus,
  Power,
  Server,
  Timer,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const formatPrice = (amount: number, digits = 4) =>
  `$${formatInternalMoney(amount, digits)}`;

const MANAGEMENT_CHARGE_MULTIPLIER = 1.25;
const DAYS_IN_ESTIMATE = 30;

type Kind = "sandbox" | "vm";

type PricingRow = {
  id: string;
  name: string;
  provider: string;
  region?: string;
  cpu: string | null;
  ram: string | null;
  /** Price per billing unit, already formatted. */
  price: string;
  finePrint?: string;
  /** Hourly cost in internal money units, including the management charge. */
  hourly: number;
};

export default function PricingClientView({
  data,
}: {
  data: PricingMetadata | null;
}) {
  const [kind, setKind] = useState<Kind>("sandbox");
  const [selectedInstanceRegionId, setSelectedInstanceRegionId] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [selectedRowId, setSelectedRowId] = useState("");

  const instanceRegions = data?.instances.map(({ region }) => region) ?? [];
  const activeInstanceRegionId =
    selectedInstanceRegionId || instanceRegions[0]?.id || "";

  const sandboxRows: PricingRow[] = (data?.sandboxes ?? [])
    .flatMap(({ region, types }) => types.map((type) => ({ region, type })))
    .sort(
      (left, right) => left.type.price_per_second - right.type.price_per_second,
    )
    .map(({ region, type }) => ({
      id: type.id,
      name: type.name,
      provider: type.provider,
      region: region.name,
      cpu: type.cpu,
      ram: type.ram,
      // Billing is per started minute today; the per-second rate is fine print.
      price: formatPrice(
        type.price_per_second * 60 * MANAGEMENT_CHARGE_MULTIPLIER,
        5,
      ),
      finePrint: `${formatPrice(
        type.price_per_second * MANAGEMENT_CHARGE_MULTIPLIER,
        7,
      )}/sec rate`,
      hourly: type.price_per_second * 60 * 60 * MANAGEMENT_CHARGE_MULTIPLIER,
    }));

  const vmRows: PricingRow[] = [
    ...(data?.instances.find(
      ({ region }) => region.id === activeInstanceRegionId,
    )?.types ?? []),
  ]
    .sort((left, right) => left.price_per_hour - right.price_per_hour)
    .map((type) => ({
      id: type.id,
      name: type.name,
      provider: type.provider,
      cpu: type.cpu,
      ram: type.ram,
      price: formatPrice(type.price_per_hour * MANAGEMENT_CHARGE_MULTIPLIER),
      hourly: type.price_per_hour * MANAGEMENT_CHARGE_MULTIPLIER,
    }));

  const rows = kind === "sandbox" ? sandboxRows : vmRows;
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? rows[0];
  const maxHourly = Math.max(...rows.map((row) => row.hourly), 1);
  const hoursInEstimate = (hoursPerDay * daysPerWeek * DAYS_IN_ESTIMATE) / 7;
  const cheapestSandbox = data?.sandboxes
    .flatMap(({ types }) => types)
    .sort((left, right) => left.price_per_second - right.price_per_second)[0];

  return (
    <article className="bg-lp-canvas text-lp-ink selection:bg-lp-accent overflow-hidden selection:text-white">
      {/* Hero */}
      <section className="relative px-5 pt-16 pb-16 sm:px-8 sm:pt-24 sm:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--lp-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--lp-grid)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-[size:56px_56px]" />
        <div className="lp-hero-glow pointer-events-none absolute top-10 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="text-center lg:text-left">
            <div className="lp-hero-in border-lp-ink/10 bg-lp-surface/70 mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm">
              <Zap className="fill-lp-accent text-lp-accent size-3" />
              Usage-based · no subscription
            </div>
            <h1
              className="lp-hero-in text-[clamp(2.75rem,6.4vw,5.6rem)] leading-[0.92] font-semibold tracking-[-0.06em]"
              style={{ animationDelay: "80ms" }}
            >
              Pay for the work,
              <span className="block">
                <span className="lp-underline">not the waiting</span>.
              </span>
            </h1>
            <p
              className="lp-hero-in text-lp-ink/55 mx-auto mt-8 max-w-xl text-lg leading-8 text-balance lg:mx-0"
              style={{ animationDelay: "180ms" }}
            >
              Sandboxes bill per minute, virtual machines per hour. Idle
              workspaces shut themselves down, so the meter stops when your
              agent does.
            </p>
            <div
              className="lp-hero-in mt-8 flex flex-wrap items-center justify-center gap-2 text-xs lg:justify-start"
              style={{ animationDelay: "260ms" }}
            >
              {[
                { icon: Timer, label: "Per-minute sandboxes" },
                { icon: Server, label: "Hourly VMs" },
                { icon: Power, label: "Auto-shutdown" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="border-lp-ink/10 bg-lp-surface text-lp-ink/70 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium"
                >
                  <Icon className="text-lp-accent size-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {cheapestSandbox ? (
            <div className="lp-hero-in" style={{ animationDelay: "340ms" }}>
              <LiveMeter
                name={cheapestSandbox.name}
                pricePerSecond={
                  cheapestSandbox.price_per_second *
                  MANAGEMENT_CHARGE_MULTIPLIER
                }
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* Prices */}
      <section className="border-lp-ink/10 bg-lp-surface border-t px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <InView threshold={0.1}>
            <p className="lp-reveal text-lp-accent text-xs font-semibold tracking-[0.18em] uppercase">
              Compute prices
            </p>
            <h2
              className="lp-reveal mt-5 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-5xl"
              style={{ "--d": "80ms" } as CSSProperties}
            >
              Pick a workspace. Slide to your schedule.
            </h2>
            <p
              className="lp-reveal text-lp-ink/50 mt-5 max-w-2xl text-base leading-7"
              style={{ "--d": "160ms" } as CSSProperties}
            >
              Every price includes the VibeOnGo management charge. Estimates
              update as you change how often your workspace runs.
            </p>
          </InView>

          {!data ? (
            <p className="text-destructive mt-10 text-sm">
              Unable to load pricing information.
            </p>
          ) : (
            <>
              <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <KindToggle kind={kind} onChange={setKind} />
                {kind === "vm" && instanceRegions.length > 0 ? (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-lp-ink/50">Region</span>
                    <select
                      value={activeInstanceRegionId}
                      onChange={(event) =>
                        setSelectedInstanceRegionId(event.target.value)
                      }
                      className="border-lp-ink/15 bg-lp-surface text-lp-ink h-10 rounded-full border px-4"
                    >
                      {instanceRegions.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.provider} · {region.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="text-lp-ink/50 text-sm">
                    Disposable, isolated workspaces — billed per started minute.
                  </p>
                )}
              </div>

              {rows.length === 0 || !selectedRow ? (
                <p className="text-lp-ink/50 mt-8 text-sm">
                  {kind === "sandbox"
                    ? "No sandbox options are available."
                    : "No virtual machine options are available."}
                </p>
              ) : (
                <InView
                  threshold={0.05}
                  className="mt-8 grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8"
                >
                  <div className="lp-pop lg:sticky lg:top-24">
                    <Estimator
                      row={selectedRow}
                      kind={kind}
                      hoursPerDay={hoursPerDay}
                      daysPerWeek={daysPerWeek}
                      hoursInEstimate={hoursInEstimate}
                      onHoursPerDay={setHoursPerDay}
                      onDaysPerWeek={setDaysPerWeek}
                    />
                  </div>

                  {/* Re-keyed so the list replays its entrance on every switch. */}
                  <div
                    key={`${kind}-${activeInstanceRegionId}`}
                    role="radiogroup"
                    aria-label="Workspace size"
                    className="space-y-3"
                  >
                    {rows.map((row, index) => (
                      <OptionRow
                        key={row.id}
                        row={row}
                        kind={kind}
                        selected={row.id === selectedRow.id}
                        lowest={index === 0 && rows.length > 1}
                        share={row.hourly / maxHourly}
                        estimate={row.hourly * hoursInEstimate}
                        delay={Math.min(index, 10) * 60}
                        onSelect={() => setSelectedRowId(row.id)}
                      />
                    ))}
                  </div>
                </InView>
              )}

              <div className="border-lp-ink/10 bg-lp-canvas text-lp-ink/60 mt-8 flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6">
                <Info className="text-lp-accent mt-0.5 size-4 shrink-0" />
                <p>
                  <span className="text-lp-ink font-medium">
                    Network usage is separate.
                  </span>{" "}
                  These prices and estimates cover base compute only.
                  Network-usage charges are added based on how much network data
                  your workspace uses.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <IncludedFeatures />
      <PricingFaq />
      <ClosingCta />
    </article>
  );
}

/**
 * A sandbox meter that ticks (one real second = one billed minute), then
 * auto-shuts down and stops billing. Sandboxes bill per started minute.
 */
function LiveMeter({
  name,
  pricePerSecond,
}: {
  name: string;
  pricePerSecond: number;
}) {
  const RUN_MINUTES = 12;
  const IDLE_MINUTES = 3;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = ((now - start) / 1000) % (RUN_MINUTES + IDLE_MINUTES);
      setElapsed(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const running = elapsed < RUN_MINUTES;
  // Every started minute is billed in full.
  const minutes = Math.min(Math.ceil(elapsed), RUN_MINUTES);
  const cost = pricePerSecond * 60 * minutes;

  return (
    <div className="lp-float relative mx-auto max-w-md">
      <div className="bg-lp-accent/20 absolute -inset-4 rounded-[2rem] blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl bg-[#17181c] p-6 text-white shadow-[0_30px_60px_-30px_rgba(23,24,28,0.6)]">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-mono text-white/60">
            <Box className="size-3.5" /> sandbox · {name}
          </span>
          <span
            className={`flex items-center gap-2 rounded-full px-2.5 py-1 font-medium transition-colors ${
              running
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-white/10 text-white/60"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                running ? "lp-pulse bg-emerald-400" : "bg-white/40"
              }`}
            />
            {running ? "Running" : "Auto-shutdown"}
          </span>
        </div>

        <p className="mt-8 text-xs text-white/40">Billed so far</p>
        <p className="mt-1 font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          ${(cost / INTERNAL_MONEY_SCALE).toFixed(5)}
        </p>
        <p className="mt-2 font-mono text-xs text-white/40 tabular-nums">
          {minutes} min · {formatPrice(pricePerSecond * 60, 5)}/min
        </p>

        <div className="mt-7 grid grid-cols-12 gap-1">
          {Array.from({ length: RUN_MINUTES }, (_, i) => (
            <span
              key={i}
              className={`h-8 rounded-sm transition-all duration-300 ${
                i < minutes
                  ? running
                    ? "bg-[#8b8cff]"
                    : "bg-white/25"
                  : "bg-white/[0.06]"
              }`}
            />
          ))}
        </div>

        <p
          className={`mt-5 flex items-center gap-2 text-xs transition-colors duration-300 ${
            running ? "text-white/40" : "text-emerald-300"
          }`}
        >
          {running ? (
            <>
              <Timer className="size-3.5" /> Billed per started minute
            </>
          ) : (
            <>
              <Check className="size-3.5" /> Idle detected — billing stopped
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function KindToggle({
  kind,
  onChange,
}: {
  kind: Kind;
  onChange: (kind: Kind) => void;
}) {
  const options: { value: Kind; label: string; icon: typeof Box }[] = [
    { value: "sandbox", label: "Sandboxes", icon: Box },
    { value: "vm", label: "Virtual machines", icon: Server },
  ];

  return (
    <div
      role="tablist"
      aria-label="Workspace type"
      className="border-lp-ink/10 bg-lp-surface relative grid grid-cols-2 rounded-full border p-1 text-sm font-medium"
    >
      <span
        aria-hidden
        className={`bg-lp-ink absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.2,1,0.3,1)] ${
          kind === "vm" ? "translate-x-full" : ""
        }`}
      />
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={kind === value}
          onClick={() => onChange(value)}
          className={`relative z-10 flex h-10 items-center justify-center gap-2 rounded-full px-4 whitespace-nowrap transition-colors duration-300 ${
            kind === value
              ? "text-lp-on-ink"
              : "text-lp-ink/55 hover:text-lp-ink"
          }`}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

const providerTones = [
  "bg-[#5b5cf0] text-white",
  "bg-[#ff7a1a] text-white",
  "bg-emerald-500 text-white",
  "bg-sky-500 text-white",
  "bg-rose-500 text-white",
];

const providerLabel = (provider: string) =>
  getProviderLogo(provider)?.label ?? provider;

function ProviderMark({ provider }: { provider: string }) {
  const logo = getProviderLogo(provider);

  if (logo) {
    return (
      <span
        className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ${
          logo.tile === "light" ? "bg-white p-2 ring-black/10" : "ring-white/10"
        }`}
      >
        <Image
          src={logo.src}
          alt={`${logo.label} logo`}
          width={40}
          height={40}
          className="size-full object-contain"
        />
      </span>
    );
  }

  // Fallback for providers without an entry in PROVIDER_LOGOS.
  const hash = [...provider].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold uppercase ${
        providerTones[hash % providerTones.length]
      }`}
    >
      {provider.slice(0, 1)}
    </span>
  );
}

function Specs({ row, dark = false }: { row: PricingRow; dark?: boolean }) {
  if (!row.cpu && !row.ram) return null;
  const chip = dark
    ? "bg-white/[0.07] text-white/75"
    : "bg-lp-muted text-lp-ink/70";
  return (
    <span className="flex flex-wrap gap-1.5 text-[11px] font-medium">
      {row.cpu ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${chip}`}
        >
          <Cpu className="size-3" /> {row.cpu}
        </span>
      ) : null}
      {row.ram ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${chip}`}
        >
          <MemoryStick className="size-3" /> {row.ram}
        </span>
      ) : null}
    </span>
  );
}

function Estimator({
  row,
  kind,
  hoursPerDay,
  daysPerWeek,
  hoursInEstimate,
  onHoursPerDay,
  onDaysPerWeek,
}: {
  row: PricingRow;
  kind: Kind;
  hoursPerDay: number;
  daysPerWeek: number;
  hoursInEstimate: number;
  onHoursPerDay: (value: number) => void;
  onDaysPerWeek: (value: number) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-[2.25rem] bg-[#5b5cf0]/25 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] bg-[#17181c] p-6 text-white shadow-[0_40px_80px_-40px_rgba(23,24,28,0.7)] sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[#5b5cf0]/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <ProviderMark provider={row.provider} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.name}</p>
            <p className="truncate text-xs text-white/45">
              {providerLabel(row.provider)}
              {row.region ? ` · ${row.region}` : ""}
            </p>
          </div>
        </div>
        <div className="relative mt-4">
          <Specs row={row} dark />
        </div>

        <p className="relative mt-8 text-xs tracking-[0.16em] text-white/40 uppercase">
          Estimated · 30 days
        </p>
        <p className="relative mt-2 text-6xl font-semibold tracking-[-0.05em] tabular-nums sm:text-7xl">
          <TweenedNumber
            value={row.hourly * hoursInEstimate}
            format={(v) => formatPrice(v, 2)}
          />
        </p>
        <p className="relative mt-2 text-sm text-white/45 tabular-nums">
          <TweenedNumber
            value={hoursInEstimate}
            format={(v) => `${Math.round(v)} hours`}
          />{" "}
          of runtime · {row.price} / {kind === "sandbox" ? "minute" : "hour"}
        </p>

        <div className="relative mt-8 space-y-6 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
          <DarkSlider
            label="Hours per day"
            value={hoursPerDay}
            min={1}
            max={24}
            suffix="h"
            onChange={onHoursPerDay}
          />
          <DarkSlider
            label="Days per week"
            value={daysPerWeek}
            min={1}
            max={7}
            suffix="d"
            onChange={onDaysPerWeek}
          />
        </div>

        <ul className="relative mt-6 space-y-2 text-xs text-white/50">
          <li className="flex items-center gap-2">
            <Check className="size-3.5 text-emerald-300" /> Management charge
            included
          </li>
          <li className="flex items-center gap-2">
            <Power className="size-3.5 text-emerald-300" /> Auto-shutdown stops
            idle billing
          </li>
          {kind === "sandbox" ? (
            <li className="flex items-center gap-2">
              <Timer className="size-3.5 text-emerald-300" /> Billed per started
              minute
              <span className="text-white/30">({row.finePrint})</span>
            </li>
          ) : null}
        </ul>

        <a
          href={getAppUrl("/login")}
          className="group relative mt-8 flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#17181c] transition-transform hover:-translate-y-0.5"
        >
          Launch this workspace
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );
}

function DarkSlider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-white/55">{label}</span>
        <span className="font-mono font-semibold tabular-nums">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full cursor-pointer accent-[#8b8cff]"
      />
    </label>
  );
}

function OptionRow({
  row,
  kind,
  selected,
  lowest,
  share,
  estimate,
  delay,
  onSelect,
}: {
  row: PricingRow;
  kind: Kind;
  selected: boolean;
  lowest: boolean;
  share: number;
  estimate: number;
  delay: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`lp-rise group relative block w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 sm:p-5 ${
        selected
          ? "border-lp-accent bg-lp-accent-soft shadow-[0_18px_40px_-24px_rgba(91,92,240,0.6)]"
          : "border-lp-ink/10 bg-lp-canvas hover:border-lp-ink/25"
      }`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {/* Selected indicator */}
      <span
        className={`bg-lp-accent absolute inset-y-3 left-0 w-1 rounded-r-full transition-transform duration-300 ${
          selected ? "scale-y-100" : "scale-y-0"
        }`}
      />
      <div className="flex items-center gap-4">
        <ProviderMark provider={row.provider} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{row.name}</span>
            {lowest ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-300">
                Lowest price
              </span>
            ) : null}
          </p>
          <p className="text-lp-ink/45 mt-0.5 truncate text-xs">
            {providerLabel(row.provider)}
            {row.region ? ` · ${row.region}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-base font-semibold tabular-nums">
            {row.price}
            <span className="text-lp-ink/40 font-sans text-xs font-normal">
              /{kind === "sandbox" ? "min" : "hr"}
            </span>
          </p>
          <p className="text-lp-accent mt-0.5 text-xs font-semibold tabular-nums">
            <TweenedNumber value={estimate} format={(v) => formatPrice(v, 2)} />
            <span className="text-lp-ink/40 font-normal"> / 30d</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Specs row={row} />
        {/* Relative cost bar */}
        <span className="bg-lp-ink/[0.06] h-1.5 flex-1 overflow-hidden rounded-full">
          <span
            className="lp-line bg-lp-accent block h-full rounded-full"
            style={{
              width: `${Math.max(share * 100, 6)}%`,
              animationDelay: `${delay + 250}ms`,
              animationDuration: "900ms",
            }}
          />
        </span>
      </div>
    </button>
  );
}

/** Eases from the previous value to the new one so estimates visibly roll. */
function TweenedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    const duration = 450;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (value - from) * eased;
      fromRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{format(display)}</>;
}

function IncludedFeatures() {
  const features = [
    "Automatic pull-request review",
    "Automatic issue review and fixing",
    "Fresh isolated environment for automated work",
    "Live HTTPS preview URLs",
    "Parallel workspace execution (tier-limited)",
    "Automatic workspace expiration",
  ];

  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <InView
        threshold={0.15}
        className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20"
      >
        <div>
          <p className="lp-reveal text-lp-accent text-xs font-semibold tracking-[0.18em] uppercase">
            What you get
          </p>
          <h2
            className="lp-reveal mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-5xl"
            style={{ "--d": "80ms" } as CSSProperties}
          >
            More than a VM with a price tag.
          </h2>
          <p
            className="lp-reveal text-lp-ink/50 mt-5 max-w-md text-base leading-7"
            style={{ "--d": "160ms" } as CSSProperties}
          >
            A standard always-on provider VM gives you a machine. VibeOnGo wraps
            it in the platform your agents need.
          </p>
        </div>

        <div className="lp-pop overflow-hidden rounded-3xl bg-[#17181c] text-white shadow-[0_30px_60px_-30px_rgba(23,24,28,0.6)]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-white/10 px-5 py-4 text-xs text-white/40 sm:gap-x-8 sm:px-7">
            <span>Feature</span>
            <span className="w-14 text-center sm:w-20">Plain VM</span>
            <span className="w-14 text-center text-[#a7a8ff] sm:w-20">
              VibeOnGo
            </span>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {features.map((feature, index) => (
              <li
                key={feature}
                className="lp-rise grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-5 py-4 text-sm transition-colors hover:bg-white/[0.03] sm:gap-x-8 sm:px-7"
                style={{ "--d": `${300 + index * 90}ms` } as CSSProperties}
              >
                <span className="font-medium text-white/85">{feature}</span>
                <span className="flex w-14 justify-center sm:w-20">
                  <X
                    className="size-4 text-white/25"
                    aria-label="Not included"
                  />
                </span>
                <span className="flex w-14 justify-center sm:w-20">
                  <span
                    className="lp-dot flex size-6 items-center justify-center rounded-full bg-emerald-400/15"
                    style={{ "--d": `${600 + index * 90}ms` } as CSSProperties}
                  >
                    <Check
                      className="size-3.5 text-emerald-300"
                      strokeWidth={2.5}
                      aria-label="Included"
                    />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </InView>
    </section>
  );
}

function PricingFaq() {
  const questions = [
    {
      question: "How does VibeOnGo pricing work?",
      answer:
        "Sandboxes are billed per started minute and virtual machines are billed per hour. The 30-day estimates assume 8 hours a day, 5 days a week by default — adjust the sliders to match your schedule. Prices include the VibeOnGo management charge.",
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
    <section
      className="border-lp-ink/10 bg-lp-surface border-t px-5 py-20 sm:px-8 sm:py-28"
      aria-labelledby="pricing-faq"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div>
          <p className="text-lp-accent text-xs font-semibold tracking-[0.18em] uppercase">
            FAQ
          </p>
          <h2
            id="pricing-faq"
            className="mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-5xl"
          >
            Pricing, answered.
          </h2>
        </div>
        <div className="divide-lp-ink/10 border-lp-ink/10 divide-y border-y">
          {questions.map(({ question, answer }, index) => (
            <details key={question} className="group py-5" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium [&::-webkit-details-marker]:hidden">
                {question}
                <Plus className="text-lp-ink/40 size-4 shrink-0 transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="text-lp-ink/50 mt-3 max-w-2xl text-sm leading-6">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
