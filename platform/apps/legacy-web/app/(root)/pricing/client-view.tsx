"use client";

import type { PricingMetadata } from "@/services/instance-metadata-service";
import { ClosingCta } from "@/components/landing-page/closing-cta";
import { getAppUrl } from "@/lib/app-url";
import { getProviderLogo } from "@/lib/provider-logos";
import { formatInternalMoney } from "@repo/shared";
import {
  ArrowRight,
  Box,
  Check,
  Cpu,
  HardDrive,
  Info,
  MemoryStick,
  Plus,
  Power,
  RotateCw,
  Server,
  Timer,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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
  cpu: number;
  ram: number;
  storage: number;
  /** Price per billing unit, already formatted. */
  price: string;
  finePrint?: string;
  /** Per-minute cost in internal money units, including the management charge. */
  perMinute: number;
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
      storage: type.storage,
      // Billing is per started minute today; the per-second rate is fine print.
      price: formatPrice(
        type.price_per_second * 60 * MANAGEMENT_CHARGE_MULTIPLIER,
        5,
      ),
      finePrint: `${formatPrice(
        type.price_per_second * MANAGEMENT_CHARGE_MULTIPLIER,
        7,
      )}/sec rate`,
      perMinute: type.price_per_second * 60 * MANAGEMENT_CHARGE_MULTIPLIER,
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
      region: instanceRegions.find(
        (region) => region.id === activeInstanceRegionId,
      )?.name,
      cpu: type.cpu,
      ram: type.ram,
      storage: type.storage,
      // Match the server conversion from stored hourly rates to started-minute billing.
      price: formatPrice(
        Math.ceil(type.price_per_hour / 60) * MANAGEMENT_CHARGE_MULTIPLIER,
        5,
      ),
      perMinute:
        Math.ceil(type.price_per_hour / 60) * MANAGEMENT_CHARGE_MULTIPLIER,
    }));

  const rows = kind === "sandbox" ? sandboxRows : vmRows;
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? rows[0];
  const hoursInEstimate = (hoursPerDay * daysPerWeek * DAYS_IN_ESTIMATE) / 7;

  return (
    <article className="home-page pricing-page">
      <section className="pricing-intro" aria-labelledby="pricing-title">
        <div className="pricing-container">
          <h1 id="pricing-title">Pay for the work, not the waiting.</h1>
          <p>
            Sandboxes and virtual machines bill per started minute. Run your
            agent, then let auto-shutdown stop idle compute.
          </p>
          <div className="pricing-billing-facts">
            <span>
              <Timer size={16} aria-hidden="true" />
              Usage-based billing
            </span>
            <span>
              <Check size={16} aria-hidden="true" />
              Management charge included
            </span>
            <span>
              <Power size={16} aria-hidden="true" />
              Automatic shutdown
            </span>
          </div>
        </div>
      </section>

      <section
        className="pricing-compute pricing-container"
        aria-labelledby="compute-title"
      >
        <div className="pricing-section-heading">
          <div>
            <h2 id="compute-title">Find your workspace.</h2>
            <p>Compare compute. Set your schedule. See what it costs.</p>
          </div>
          <fieldset className="pricing-kind-toggle">
            <legend className="sr-only">Workspace type</legend>
            {(
              [
                { value: "sandbox", label: "Sandboxes", icon: Box },
                { value: "vm", label: "Virtual machines", icon: Server },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={kind === value ? "is-selected" : ""}
              >
                <input
                  type="radio"
                  name="pricing-kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => {
                    setKind(value);
                    setSelectedRowId("");
                  }}
                />
                <Icon size={16} aria-hidden="true" />
                {label}
              </label>
            ))}
          </fieldset>
        </div>

        {!data ? (
          <div className="pricing-empty" role="alert">
            <Info size={24} aria-hidden="true" />
            <h3>Pricing is temporarily unavailable.</h3>
            <p>
              We couldn&apos;t load the current provider rates. Try again to see
              live prices.
            </p>
            <button
              type="button"
              className="home-button home-button-blue"
              onClick={() => window.location.reload()}
            >
              <RotateCw size={16} aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="pricing-controls">
              <p>
                {kind === "sandbox"
                  ? "Disposable, isolated workspaces. Billed per started minute."
                  : "Persistent workspaces for ongoing development. Billed per started minute."}
              </p>
              {kind === "vm" && instanceRegions.length > 0 && (
                <label className="pricing-region">
                  <span>Region</span>
                  <select
                    value={activeInstanceRegionId}
                    onChange={(event) => {
                      setSelectedInstanceRegionId(event.target.value);
                      setSelectedRowId("");
                    }}
                  >
                    {instanceRegions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {providerLabel(region.provider)} · {region.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {rows.length === 0 || !selectedRow ? (
              <div className="pricing-empty">
                <h3>
                  No {kind === "sandbox" ? "sandbox" : "virtual machine"}{" "}
                  options are available.
                </h3>
                <p>
                  Choose another workspace type
                  {kind === "vm" ? " or region" : ""} to compare available
                  compute.
                </p>
              </div>
            ) : (
              <div className="pricing-calculator">
                <div className="pricing-workspaces">
                  <div className="pricing-list-heading" aria-hidden="true">
                    <span>Workspace / provider</span>
                    <span>Resources</span>
                    <span>Rate / minute</span>
                  </div>
                  <fieldset className="pricing-options">
                    <legend className="sr-only">Workspace size</legend>
                    {rows.map((row, index) => (
                      <OptionRow
                        key={row.id}
                        row={row}
                        selected={row.id === selectedRow.id}
                        lowest={index === 0 && rows.length > 1}
                        onSelect={() => setSelectedRowId(row.id)}
                      />
                    ))}
                  </fieldset>
                </div>
                <Estimator
                  row={selectedRow}
                  hoursPerDay={hoursPerDay}
                  daysPerWeek={daysPerWeek}
                  hoursInEstimate={hoursInEstimate}
                  onHoursPerDay={setHoursPerDay}
                  onDaysPerWeek={setDaysPerWeek}
                />
              </div>
            )}
            <p className="pricing-network-note">
              <Info size={17} aria-hidden="true" />
              <span>
                <strong>Network usage is separate.</strong> Prices and estimates
                cover base compute only. Data-transfer charges depend on how
                much network data your workspace uses.
              </span>
            </p>
          </>
        )}
      </section>
      <IncludedFeatures />
      <PricingFaq />
      <ClosingCta />
    </article>
  );
}

const providerLabel = (provider: string) =>
  getProviderLogo(provider)?.label ?? provider;

function ProviderMark({ provider }: { provider: string }) {
  const logo = getProviderLogo(provider);
  return (
    <span
      className={`pricing-provider-mark ${logo?.tile === "light" ? "provider-light" : "provider-dark"}`}
    >
      {logo ? (
        <Image src={logo.src} alt="" width={32} height={32} />
      ) : (
        <Server size={18} aria-hidden="true" />
      )}
    </span>
  );
}

function Specs({ row }: { row: PricingRow }) {
  return (
    <span className="pricing-specs">
      <span>
        <Cpu size={13} aria-hidden="true" />
        {row.cpu} vCPU
      </span>
      <span>
        <MemoryStick size={13} aria-hidden="true" />
        {row.ram} GB RAM
      </span>
      <span>
        <HardDrive size={13} aria-hidden="true" />
        {row.storage} GB storage
      </span>
    </span>
  );
}

function OptionRow({
  row,
  selected,
  lowest,
  onSelect,
}: {
  row: PricingRow;
  selected: boolean;
  lowest: boolean;
  onSelect: () => void;
}) {
  return (
    <label className={`pricing-option ${selected ? "is-selected" : ""}`}>
      <input
        type="radio"
        name="pricing-workspace"
        value={row.id}
        checked={selected}
        onChange={onSelect}
      />
      <span className="pricing-workspace-name">
        <ProviderMark provider={row.provider} />
        <span>
          <span className="pricing-option-name">{row.name}</span>
          <span className="pricing-option-provider">
            {providerLabel(row.provider)}
            {row.region ? ` · ${row.region}` : ""}
            {lowest && <span className="pricing-lowest">Lowest price</span>}
          </span>
        </span>
      </span>
      <Specs row={row} />
      <span className="pricing-option-rate">
        {row.price}
        <span>/min</span>
      </span>
    </label>
  );
}

function Estimator({
  row,
  hoursPerDay,
  daysPerWeek,
  hoursInEstimate,
  onHoursPerDay,
  onDaysPerWeek,
}: {
  row: PricingRow;
  hoursPerDay: number;
  daysPerWeek: number;
  hoursInEstimate: number;
  onHoursPerDay: (value: number) => void;
  onDaysPerWeek: (value: number) => void;
}) {
  return (
    <aside className="pricing-estimator" aria-labelledby="estimate-title">
      <h3 id="estimate-title">Your 30-day estimate</h3>
      <output
        className="pricing-estimate-amount"
        aria-live="polite"
        aria-atomic="true"
      >
        {formatPrice(row.perMinute * hoursInEstimate * 60, 2)}
      </output>
      <p className="pricing-runtime-hours">
        {Math.round(hoursInEstimate)} hours of runtime
      </p>
      <div className="pricing-estimate-workspace">
        <strong>{row.name}</strong>
        <span>
          {providerLabel(row.provider)}
          {row.region ? ` · ${row.region}` : ""}
        </span>
        <span>{row.price} / minute</span>
      </div>
      <div className="pricing-schedule">
        <ScheduleSlider
          label="Hours per day"
          value={hoursPerDay}
          min={1}
          max={24}
          suffix="hours"
          onChange={onHoursPerDay}
        />
        <ScheduleSlider
          label="Days per week"
          value={daysPerWeek}
          min={1}
          max={7}
          suffix="days"
          onChange={onDaysPerWeek}
        />
      </div>
      <p className="pricing-estimate-note">
        Based on {hoursPerDay} {hoursPerDay === 1 ? "hour" : "hours"} per day,{" "}
        {daysPerWeek} {daysPerWeek === 1 ? "day" : "days"} per week, over 30
        days.
      </p>
      <ul className="pricing-estimate-includes">
        <li>
          <Check size={15} aria-hidden="true" />
          Management charge included
        </li>
        <li>
          <Power size={15} aria-hidden="true" />
          Auto-shutdown stops idle billing
        </li>
        <li>
          <Timer size={15} aria-hidden="true" />
          Billed per started minute
        </li>
      </ul>
      {row.finePrint && <p className="pricing-second-rate">{row.finePrint}</p>}
      <a href={getAppUrl("/login")} className="home-button home-button-white">
        Launch this workspace
        <ArrowRight size={17} aria-hidden="true" />
      </a>
      <p className="pricing-estimate-exclusion">
        Base compute only. Network usage is extra.
      </p>
    </aside>
  );
}

function ScheduleSlider({
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
    <label className="pricing-slider">
      <span>
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-valuetext={`${value} ${suffix}`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="pricing-slider-bounds" aria-hidden="true">
        <span>{min}</span>
        <span>{max}</span>
      </span>
    </label>
  );
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
    <section className="pricing-included" aria-labelledby="included-title">
      <div className="pricing-container pricing-support-grid">
        <div>
          <h2 id="included-title">
            More than a VM
            <br />
            with a price tag.
          </h2>
          <p>
            A standard always-on provider VM gives you a machine. VibeOnGo wraps
            it in the platform your agents need.
          </p>
        </div>
        <div className="pricing-comparison">
          <div className="pricing-comparison-row pricing-comparison-head">
            <span>Feature</span>
            <span>Plain VM</span>
            <span>VibeOnGo</span>
          </div>
          <ul>
            {features.map((feature) => (
              <li key={feature} className="pricing-comparison-row">
                <span>{feature}</span>
                <span>
                  <X size={16} aria-hidden="true" />
                  <span className="sr-only">Not included in a plain VM</span>
                </span>
                <span>
                  <Check size={17} aria-hidden="true" />
                  <span className="sr-only">Included in VibeOnGo</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PricingFaq() {
  const questions = [
    {
      question: "How does VibeOnGo pricing work?",
      answer:
        "Sandboxes and virtual machines are billed per started minute. The 30-day estimates assume 8 hours a day, 5 days a week by default — adjust the sliders to match your schedule. Prices include the VibeOnGo management charge.",
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
      className="pricing-faq pricing-container"
      aria-labelledby="pricing-faq-title"
    >
      <h2 id="pricing-faq-title">Pricing, answered.</h2>
      <div>
        {questions.map(({ question, answer }, index) => (
          <details key={question} open={index === 0}>
            <summary>
              {question}
              <Plus size={18} aria-hidden="true" />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
