"use client";

import type { OpencodeInventory, OpencodeSessionData } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";

export function OpencodeContextUsageMenu({
  session,
  inventory,
}: {
  session: OpencodeSessionData;
  inventory?: OpencodeInventory;
}) {
  const assistant = [...session.messages].reverse().find((message) => {
    if (message.info.role !== "assistant") return false;
    const tokens = message.info.tokens;
    return (
      tokens.input +
        tokens.output +
        tokens.reasoning +
        tokens.cache.read +
        tokens.cache.write >
      0
    );
  });
  const tokens =
    assistant?.info.role === "assistant" ? assistant.info.tokens : undefined;
  const modelId =
    assistant?.info.role === "assistant"
      ? `${assistant.info.providerID}/${assistant.info.modelID}`
      : session.session.model
        ? `${session.session.model.providerID}/${session.session.model.id}`
        : undefined;
  const model = inventory?.models.find((item) => item.id === modelId);
  const total = tokens
    ? tokens.input +
      tokens.output +
      tokens.reasoning +
      tokens.cache.read +
      tokens.cache.write
    : 0;
  const limit = model?.contextLimit ?? 0;
  const percentage = limit
    ? Math.min(100, Math.round((total / limit) * 100))
    : 0;
  const messageCount = session.messages.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="bg-background/90 shadow-sm backdrop-blur"
          aria-label={`Context usage${limit ? ` ${percentage}%` : ""}`}
          title={limit ? `${percentage}% context used` : "Context usage"}
        >
          <ContextRing percentage={percentage} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span>Context usage</span>
          <span className="text-muted-foreground text-xs font-normal tabular-nums">
            {limit ? `${percentage}%` : "Unavailable"}
          </span>
        </DropdownMenuLabel>
        <div className="px-3 pb-3">
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-xs tabular-nums">
            {formatNumber(total)} of {limit ? formatNumber(limit) : "—"} tokens
          </p>
        </div>
        <DropdownMenuSeparator />
        <div className="grid gap-2 px-3 py-3 text-xs">
          <UsageRow label="Input" value={formatNumber(tokens?.input)} />
          <UsageRow label="Output" value={formatNumber(tokens?.output)} />
          <UsageRow label="Reasoning" value={formatNumber(tokens?.reasoning)} />
          <UsageRow
            label="Cache read / write"
            value={`${formatNumber(tokens?.cache.read)} / ${formatNumber(tokens?.cache.write)}`}
          />
          <UsageRow label="Messages" value={formatNumber(messageCount)} />
          <UsageRow label="Cost" value={formatCost(session.session.cost)} />
        </div>
        {model ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2.5">
              <p className="text-muted-foreground text-xs">Model</p>
              <p className="mt-0.5 truncate text-sm" title={model.name}>
                {model.name}
              </p>
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContextRing({ percentage }: { percentage: number }) {
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);
  return (
    <svg viewBox="0 0 18 18" className="size-4.5 -rotate-90" aria-hidden="true">
      <circle
        cx="9"
        cy="9"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground/25"
      />
      <circle
        cx="9"
        cy="9"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-foreground transition-[stroke-dashoffset]"
      />
    </svg>
  );
}

function UsageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function formatNumber(value?: number) {
  return (value ?? 0).toLocaleString();
}

function formatCost(value?: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value ?? 0);
}
