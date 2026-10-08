"use client";

import MarkdownRenderer from "@/components/markdown-renderer";
import {
  getOpencodeSessionExportFilename,
  type OpencodeInventory,
  type OpencodeSessionData,
} from "@repo/api-client";
import { useExportOpencodeSession } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import { Download, Gauge, Loader2, X } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { toast } from "sonner";

type Connection = {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
};

function usageOf(session?: OpencodeSessionData, inventory?: OpencodeInventory) {
  const message = session?.messages
    .slice()
    .reverse()
    .find(
      ({ info }) =>
        info.role === "assistant" &&
        info.tokens.input +
          info.tokens.output +
          info.tokens.reasoning +
          info.tokens.cache.read +
          info.tokens.cache.write >
          0,
    );
  const info = message?.info.role === "assistant" ? message.info : undefined;
  const tokens = info?.tokens;
  const modelId = info
    ? `${info.providerID}/${info.modelID}`
    : session?.session.model
      ? `${session.session.model.providerID}/${session.session.model.id}`
      : undefined;
  const model = inventory?.models.find((entry) => entry.id === modelId);
  const total = tokens
    ? tokens.input +
      tokens.output +
      tokens.reasoning +
      tokens.cache.read +
      tokens.cache.write
    : undefined;
  const limit =
    model?.contextLimit && model.contextLimit > 0
      ? model.contextLimit
      : undefined;
  return {
    tokens,
    total,
    limit,
    model,
    provider:
      model?.providerName ??
      info?.providerID ??
      session?.session.model?.providerID,
    modelName: model?.name ?? info?.modelID ?? session?.session.model?.id,
    percentage:
      total !== undefined && limit
        ? Math.round((total / limit) * 100)
        : undefined,
  };
}

export function OpencodeContextButton({
  session,
  inventory,
  isOpen,
  onClick,
  buttonRef,
}: {
  session?: OpencodeSessionData;
  inventory?: OpencodeInventory;
  isOpen: boolean;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const usage = useMemo(
    () => usageOf(session, inventory),
    [session, inventory],
  );
  return (
    <Button
      ref={buttonRef}
      type="button"
      variant={isOpen ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={`${isOpen ? "Close" : "Open"} context panel`}
      aria-pressed={isOpen}
      title={
        usage.percentage === undefined
          ? "Context"
          : `Context · ${usage.percentage}% used`
      }
      onClick={onClick}
    >
      <ContextRing percentage={usage.percentage} />
    </Button>
  );
}

function ContextRing({ percentage }: { percentage?: number }) {
  const circumference = 2 * Math.PI * 7;
  return (
    <svg viewBox="0 0 18 18" className="size-4.5 -rotate-90" aria-hidden="true">
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground/25"
      />
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={
          circumference *
          (1 - Math.min(100, Math.max(0, percentage ?? 0)) / 100)
        }
      />
    </svg>
  );
}

export function OpencodeContextPanel({
  session,
  inventory,
  connection,
  onClose,
  hasOlderMessages = false,
  isLoadingOlder = false,
  onLoadOlder,
  isActive = true,
}: {
  session?: OpencodeSessionData;
  inventory?: OpencodeInventory;
  connection?: Connection;
  onClose: () => void;
  hasOlderMessages?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => Promise<unknown>;
  isActive?: boolean;
}) {
  const usage = useMemo(
    () => usageOf(session, inventory),
    [session, inventory],
  );
  const counts = useMemo(
    () => ({
      user:
        session?.messages.filter(({ info }) => info.role === "user").length ??
        0,
      assistant:
        session?.messages.filter(({ info }) => info.role === "assistant")
          .length ?? 0,
    }),
    [session?.messages],
  );
  const stats = [
    ["Session", session?.session.title || session?.session.id || "—"],
    [
      hasOlderMessages ? "Loaded messages" : "Messages",
      number(session?.messages.length),
    ],
    ["Provider", usage.provider ?? "—"],
    ["Model", usage.modelName ?? "—"],
    ["Context limit", number(usage.limit)],
    ["Total tokens", number(usage.total)],
    [
      "Context usage",
      usage.percentage === undefined ? "—" : `${usage.percentage}%`,
    ],
    ["Input tokens", number(usage.tokens?.input)],
    ["Output tokens", number(usage.tokens?.output)],
    ["Reasoning tokens", number(usage.tokens?.reasoning)],
    [
      "Cache read / write",
      `${number(usage.tokens?.cache.read)} / ${number(usage.tokens?.cache.write)}`,
    ],
    ["User messages", number(counts.user)],
    ["Assistant messages", number(counts.assistant)],
    [
      "Total cost",
      session?.session.cost === undefined
        ? "—"
        : new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 4,
          }).format(session.session.cost),
    ],
    ["Session created", time(session?.session.time.created)],
    ["Last activity", time(session?.session.time.updated)],
  ];
  return (
    <section
      aria-label="Session context"
      className="bg-background flex h-full min-h-0 min-w-0 flex-col"
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Gauge className="text-muted-foreground size-4" />
          Context
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close context panel"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>
      <div className="@container min-h-0 flex-1 overflow-auto">
        {!session ? (
          <p className="text-muted-foreground p-6 text-sm">
            No messages yet. Token usage will appear after you start the chat.
          </p>
        ) : (
          <div className="space-y-8 px-4 py-5 @lg:px-6">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 @lg:grid-cols-2">
              {stats.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="mt-1 text-sm font-medium break-words tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground text-xs">
              Token usage reflects the latest reported model context, not
              cumulative session consumption.
              {hasOlderMessages ? " Message counts cover loaded history." : ""}
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Raw messages</h3>
                {connection && (
                  <ExportButton connection={connection} session={session} />
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Loaded message records. Export downloads the complete session.
              </p>
              {hasOlderMessages && onLoadOlder && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoadingOlder}
                  onClick={() => {
                    void onLoadOlder().catch((error: unknown) =>
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not load earlier messages",
                      ),
                    );
                  }}
                >
                  {isLoadingOlder ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Load earlier messages
                </Button>
              )}
              <div className="divide-y rounded-md border">
                {session.messages.map((message) => (
                  <RawMessage
                    key={message.info.id}
                    message={message}
                    isActive={isActive}
                  />
                ))}
                {session.messages.length === 0 && (
                  <p className="text-muted-foreground p-4 text-sm">
                    No messages in this session yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const RawMessage = memo(function RawMessage({
  message,
  isActive,
}: {
  message: OpencodeSessionData["messages"][number];
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="focus-visible:outline-ring cursor-pointer px-3 py-3 text-xs focus-visible:outline-2">
        <span className="ml-1 inline-flex max-w-[90%] flex-wrap items-center gap-x-2 gap-y-1 align-middle">
          <span className="font-medium">{message.info.role}</span>
          <span className="text-muted-foreground font-mono break-all">
            {message.info.id}
          </span>
          <time
            className="text-muted-foreground"
            dateTime={new Date(message.info.time.created).toISOString()}
          >
            {time(message.info.time.created)}
          </time>
        </span>
      </summary>
      {open && isActive && (
        <div className="overflow-auto border-t px-3 py-3">
          <MarkdownRenderer
            content={`\`\`\`json\n${JSON.stringify(message, null, 2)}\n\`\`\``}
          />
        </div>
      )}
    </details>
  );
});

function ExportButton({
  connection,
  session,
}: {
  connection: Connection;
  session: OpencodeSessionData;
}) {
  const mutation = useExportOpencodeSession(connection);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={mutation.isPending}
      onClick={() =>
        mutation.mutate(undefined, {
          onSuccess: (data) => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = getOpencodeSessionExportFilename(session.session);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          },
          onError: (error) =>
            toast.error(error.message || "Could not export session"),
        })
      }
    >
      {mutation.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Export session
    </Button>
  );
}
function number(value?: number) {
  return value === undefined ? "—" : value.toLocaleString();
}
function time(value?: number) {
  return value === undefined ? "—" : new Date(value).toLocaleString();
}
