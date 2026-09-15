"use client";

import {
  AddOpencodeMcpDialog,
  type OpencodeMcpConnection,
} from "@/components/chat/opencode-mcp-dialog";
import {
  useOpencodeMcpServers,
  useToggleOpencodeMcpServer,
} from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Switch } from "@repo/ui/components/switch";
import { Loader2, Plus, RefreshCw, Server } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function OpencodeMcpMenu({
  connection,
}: {
  connection: OpencodeMcpConnection;
}) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const servers = useOpencodeMcpServers(connection, open);
  const toggle = useToggleOpencodeMcpServer(connection);

  const toggleServer = (name: string) => {
    toggle.mutate(name, {
      onSuccess: ({ authorizationUrl }) => {
        if (!authorizationUrl) return;
        window.open(authorizationUrl, "_blank", "noopener,noreferrer");
        toast.info("Complete MCP authorization in the opened tab");
      },
      onError: (error) =>
        toast.error(error.message || "Could not update MCP server"),
    });
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="bg-background/90 shadow-sm backdrop-blur"
            aria-label="MCP servers"
            title="MCP servers"
          >
            <Server />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
            <span>MCP servers</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded p-1"
              aria-label="Refresh MCP servers"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void servers.refetch();
              }}
            >
              <RefreshCw
                className={`size-3.5 ${servers.isFetching ? "animate-spin" : ""}`}
              />
            </button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {servers.isPending ? (
            <DropdownMenuItem disabled>
              <Loader2 className="animate-spin" /> Loading servers
            </DropdownMenuItem>
          ) : servers.isError ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void servers.refetch();
              }}
            >
              <RefreshCw /> Retry loading servers
            </DropdownMenuItem>
          ) : servers.data.length ? (
            servers.data.map((server) => {
              const status = server.status.status;
              const pending =
                status === "pending" ||
                (toggle.isPending && toggle.variables === server.name);
              return (
                <DropdownMenuItem
                  key={server.name}
                  disabled={pending}
                  onSelect={(event) => event.preventDefault()}
                  className="py-1.5"
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      status === "connected"
                        ? "bg-emerald-500"
                        : status === "failed"
                          ? "bg-destructive"
                          : status === "needs_auth"
                            ? "bg-amber-500"
                            : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">{server.name}</span>
                  <span className="text-muted-foreground shrink-0 text-xs capitalize">
                    {status === "needs_auth" ? "Sign in" : status}
                  </span>
                  <span onClick={(event) => event.stopPropagation()}>
                    <Switch
                      size="sm"
                      checked={status === "connected"}
                      disabled={pending}
                      aria-label={`${status === "connected" ? "Disable" : "Enable"} ${server.name}`}
                      onCheckedChange={() => toggleServer(server.name)}
                    />
                  </span>
                </DropdownMenuItem>
              );
            })
          ) : (
            <DropdownMenuItem disabled>No servers configured</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAddOpen(true)}>
            <Plus /> Add MCP server
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddOpencodeMcpDialog
        {...connection}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </>
  );
}
