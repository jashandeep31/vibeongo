"use client";

import {
  useOpencodeWebSearchProviders,
  useReplyOpencodeWebSearchRequest,
} from "@repo/api-hooks";
import type { WebSearchRequest } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Globe2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function OpencodeWebSearchDock({
  request,
  chatId,
  directory,
  serverUrl,
  accessToken,
  password,
}: {
  request: WebSearchRequest;
  chatId: string;
  directory: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) {
  const providers = useOpencodeWebSearchProviders({
    chatId,
    directory,
    serverUrl,
    accessToken,
    password,
    enabled: !request.specific,
  });
  const options = useMemo(
    () =>
      request.specific
        ? request.options
        : [
            { value: "random", label: "Any provider" },
            ...(providers.data ?? []).map((provider) => ({
              value: provider.id,
              label: provider.name,
            })),
          ],
    [providers.data, request.options, request.specific],
  );
  const [selected, setSelected] = useState("random");
  useEffect(() => {
    if (request.specific && options[0]) setSelected(options[0].value);
  }, [options, request.id, request.specific]);
  const reply = useReplyOpencodeWebSearchRequest({
    chatId,
    sessionId: request.sessionID,
    serverUrl,
    accessToken,
    password,
  });
  const submit = (selection: string | false) =>
    reply.mutate(
      { request, selection },
      {
        onError: (error) =>
          toast.error(error.message || "Could not update web search"),
      },
    );

  return (
    <section
      className="bg-card mb-2 overflow-hidden rounded-2xl border shadow-sm"
      aria-label="Configure web search"
    >
      <div className="flex gap-3 p-4">
        <Globe2 className="mt-0.5 size-5 shrink-0 text-blue-500" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-medium">Enable web search</p>
            <p className="text-muted-foreground text-sm">
              Choose the provider OpenCode should use for this request.
            </p>
          </div>
          {providers.isError && !request.specific ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-destructive">
                Could not load providers.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void providers.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <NativeSelect
              className="w-full"
              value={selected}
              disabled={
                providers.isPending || reply.isPending || !options.length
              }
              onChange={(event) => setSelected(event.target.value)}
              aria-label="Web search provider"
            >
              {options.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </div>
      </div>
      <div className="bg-muted/40 flex justify-end gap-2 border-t p-3">
        {!request.specific ? (
          <Button
            type="button"
            variant="ghost"
            disabled={reply.isPending}
            onClick={() => submit(false)}
          >
            Disable
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={reply.isPending || providers.isPending || !selected}
          onClick={() => submit(selected)}
        >
          {reply.isPending ? <Loader2 className="animate-spin" /> : null}
          Enable
        </Button>
      </div>
    </section>
  );
}
