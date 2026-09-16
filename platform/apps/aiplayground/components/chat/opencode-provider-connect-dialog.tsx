"use client";

import {
  completeOpencodeProviderOauth,
  connectOpencodeProviderKey,
  getOpencodeProviderIntegrations,
  getOpencodeProviderOauthStatus,
  type OpencodeProviderConnectMethod,
  type OpencodeProviderIntegration,
  startOpencodeProviderOauth,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type OpencodeWebProviderConnection = {
  accessToken: string;
  chatId: string;
  directory?: string;
  onConnected: () => void | Promise<void>;
  password?: string;
  serverUrl: string;
};

export function OpencodeProviderConnectDialog({
  connection,
  onOpenChange,
  open,
}: {
  connection: OpencodeWebProviderConnection;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [providers, setProviders] = useState<OpencodeProviderIntegration[]>([]);
  const [provider, setProvider] = useState<OpencodeProviderIntegration>();
  const [method, setMethod] = useState<OpencodeProviderConnectMethod>();
  const [attempt, setAttempt] =
    useState<Awaited<ReturnType<typeof startOpencodeProviderOauth>>>();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const location = [connection.directory, connection.password] as const;

  useEffect(() => {
    if (!open) return;
    setProvider(undefined);
    setMethod(undefined);
    setAttempt(undefined);
    setValue("");
    setCopied(false);
    setError("");
    setBusy(true);
    void getOpencodeProviderIntegrations(
      connection.chatId,
      connection.serverUrl,
      connection.accessToken,
      ...location,
    )
      .then(setProviders)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setBusy(false));
  }, [
    connection.accessToken,
    connection.chatId,
    connection.directory,
    connection.password,
    connection.serverUrl,
    open,
  ]);

  const finish = async () => {
    await connection.onConnected();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open || !provider || !attempt || attempt.mode !== "auto") return;
    const timer = window.setInterval(() => {
      void getOpencodeProviderOauthStatus(
        connection.chatId,
        connection.serverUrl,
        connection.accessToken,
        provider.id,
        attempt.attemptID,
        ...location,
      )
        .then((status) => {
          if (status.status === "complete") void finish();
          if (status.status === "failed") setError(status.message);
          if (status.status === "expired")
            setError("Authorization expired. Try again.");
        })
        .catch(() => undefined);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [
    attempt,
    connection.accessToken,
    connection.chatId,
    connection.directory,
    connection.password,
    connection.serverUrl,
    open,
    provider,
  ]);

  const chooseMethod = async (next: OpencodeProviderConnectMethod) => {
    setMethod(next);
    setError("");
    if (next.type !== "oauth" || !provider) return;
    setBusy(true);
    try {
      setAttempt(
        await startOpencodeProviderOauth(
          connection.chatId,
          connection.serverUrl,
          connection.accessToken,
          provider.id,
          next.id,
          ...location,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    if (!provider || !method || !value.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (method.type === "key") {
        await connectOpencodeProviderKey(
          connection.chatId,
          connection.serverUrl,
          connection.accessToken,
          provider.id,
          value.trim(),
          ...location,
        );
      } else if (attempt) {
        await completeOpencodeProviderOauth(
          connection.chatId,
          connection.serverUrl,
          connection.accessToken,
          provider.id,
          attempt.attemptID,
          value.trim(),
          ...location,
        );
      }
      await finish();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const verificationCode = attempt?.instructions.match(
    /(?:enter|confirmation)\s+code:\s*([^\s.]+)/i,
  )?.[1];
  const back = () => {
    if (method) {
      setMethod(undefined);
      setAttempt(undefined);
      setValue("");
      return;
    }
    setProvider(undefined);
  };
  const title = method
    ? `Connect ${provider?.name}`
    : provider
      ? "Choose connection method"
      : "Connect provider";
  const rows = useMemo(
    () => [...providers].sort((a, b) => a.name.localeCompare(b.name)),
    [providers],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="flex-row items-center gap-2 border-b px-4 py-3">
          {provider ? (
            <Button
              aria-label="Back"
              onClick={back}
              size="icon-sm"
              variant="ghost"
            >
              <ArrowLeft />
            </Button>
          ) : null}
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {method ? (
          <div className="flex flex-col gap-4 p-5">
            {method.type === "oauth" ? (
              <>
                <h3 className="font-semibold">Authorize in your browser</h3>
                <p className="text-muted-foreground text-sm">
                  {attempt?.instructions ?? "Preparing authorization…"}
                </p>
                {verificationCode ? (
                  <button
                    className="bg-muted flex min-h-14 items-center justify-between rounded-lg border px-4"
                    onClick={() => {
                      void navigator.clipboard.writeText(verificationCode);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1_500);
                    }}
                    type="button"
                  >
                    <code className="text-lg font-bold tracking-widest">
                      {verificationCode}
                    </code>
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      {copied ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </span>
                  </button>
                ) : null}
                {attempt?.url ? (
                  <Button
                    onClick={() =>
                      window.open(attempt.url, "_blank", "noopener,noreferrer")
                    }
                    type="button"
                  >
                    <ExternalLink /> Open authorization page
                  </Button>
                ) : null}
              </>
            ) : null}
            {method.type === "key" || attempt?.mode === "code" ? (
              <>
                <Input
                  autoComplete="off"
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={
                    method.type === "key" ? "API key" : "Authorization code"
                  }
                  type={method.type === "key" ? "password" : "text"}
                  value={value}
                />
                <Button
                  disabled={busy || !value.trim()}
                  onClick={() => void connect()}
                  type="button"
                >
                  {busy ? <Loader2 className="animate-spin" /> : null} Connect
                </Button>
              </>
            ) : !attempt ? (
              <Loader2 className="mx-auto animate-spin" />
            ) : null}
          </div>
        ) : provider ? (
          <div className="flex max-h-80 flex-col overflow-y-auto px-4 pb-4">
            {provider.methods.map((item) => (
              <button
                className="hover:bg-muted flex min-h-14 items-center gap-3 border-b px-2 text-left"
                key={`${item.type}:${item.id ?? item.label}`}
                onClick={() => void chooseMethod(item)}
                type="button"
              >
                <span className="flex-1 font-medium">{item.label}</span>
                {item.type === "oauth" &&
                !item.label.toLowerCase().includes("headless") ? (
                  <TriangleAlert
                    aria-label="May require a reachable callback"
                    className="size-4 text-amber-500"
                  />
                ) : null}
                <ChevronRight className="text-muted-foreground size-4" />
              </button>
            ))}
          </div>
        ) : busy ? (
          <Loader2 className="mx-auto my-12 animate-spin" />
        ) : (
          <Command className="min-h-96">
            <CommandInput autoFocus placeholder="Search providers..." />
            <CommandList className="max-h-96">
              <CommandEmpty>No providers found.</CommandEmpty>
              {rows.map((item) => (
                <CommandItem
                  className="min-h-12"
                  key={item.id}
                  onSelect={() => setProvider(item)}
                  value={`${item.name} ${item.id}`}
                >
                  <span className="flex-1 font-medium">{item.name}</span>
                  {item.connected ? (
                    <Check className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        )}
        {error ? (
          <p className="text-destructive px-5 pb-4 text-sm">{error}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
