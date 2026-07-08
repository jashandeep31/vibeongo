"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";

import { ShellToolOutputDrawer } from "@/components/dialogs/shell-tool-output-drawer";
import { useWebSocketContext } from "@/hooks/use-websocket";
import { Button } from "@repo/ui/components/button";

const SHELL_TOOLS_LOGO_URL = "/tools/moshi.webp";

interface ShellToolsCardProps {
  isTerminated: boolean;
  toolTitle?: string;
}

export function ShellToolsCard({
  isTerminated,
  toolTitle = "Moshi",
}: ShellToolsCardProps) {
  const { websocket, sendJsonMessage, subscribeJsonMessage } =
    useWebSocketContext();
  const [toolOutput, setToolOutput] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const canStart = websocket?.readyState === WebSocket.OPEN && !isTerminated;

  useEffect(() => {
    if (!websocket) {
      return;
    }

    const unsubscribeMessages = subscribeJsonMessage((parsedEvent) => {
      if (parsedEvent.type !== "shelltools") {
        return;
      }

      if (
        !parsedEvent.data ||
        typeof parsedEvent.data !== "object" ||
        Array.isArray(parsedEvent.data)
      ) {
        return;
      }

      const data = parsedEvent.data as {
        tool?: unknown;
        stream?: unknown;
        output?: unknown;
      };

      if (data.tool !== "moshi" || typeof data.output !== "string") {
        return;
      }

      setToolOutput((current: string[]) => [...current, data.output as string]);

      if (
        data.stream === "stdout" ||
        data.stream === "stderr" ||
        data.stream === "error" ||
        (data.stream === "status" && data.output === "Moshi setup finished")
      ) {
        setIsStarting(false);
      }
    });

    return () => {
      unsubscribeMessages();
    };
  }, [subscribeJsonMessage, websocket]);

  const handleStart = () => {
    if (!canStart || isStarting) {
      return;
    }

    setToolOutput([]);
    setIsDialogOpen(true);
    setIsStarting(true);
    sendJsonMessage({
      type: "shelltools",
      data: {
        tool: "moshi",
        action: "start",
      },
    });
  };

  return (
    <section>
      <ShellToolOutputDrawer
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={toolTitle}
        output={toolOutput}
        isRunning={isStarting}
      />

      <div className="p-0">
        <div className="space-y-3">
          <h2 className="truncate text-base font-semibold tracking-tight">
            Shell Tools
          </h2>

          <Button
            variant="outline"
            type="button"
            disabled={!canStart || isStarting}
            aria-label={`Start ${toolTitle}`}
            title={`Start ${toolTitle}`}
            className="h-24 w-24 flex-col gap-2 p-2"
            onClick={handleStart}
          >
            {isStarting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Image
                src={SHELL_TOOLS_LOGO_URL}
                alt=""
                width={40}
                height={40}
                className="rounded-md object-cover"
                unoptimized
              />
            )}
            <span className="max-w-full truncate text-xs font-medium">
              {toolTitle}
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
