"use client";

import { useAddOpencodeMcpServer } from "@repo/api-hooks";
import type { OpencodeMcpConfig } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import { Textarea } from "@repo/ui/components/textarea";
import { Loader2, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export type OpencodeMcpConnection = {
  chatId: string;
  serverUrl: string;
  accessToken: string;
  directory: string;
  password?: string;
};

export function AddOpencodeMcpDialog({
  open,
  onOpenChange,
  ...connection
}: OpencodeMcpConnection & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add MCP server</DialogTitle>
          <DialogDescription>
            Connect a local command or remote MCP endpoint to this OpenCode
            workspace.
          </DialogDescription>
        </DialogHeader>
        <AddMcpServer
          connection={connection}
          onAdded={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddMcpServer({
  connection,
  onAdded,
}: {
  connection: OpencodeMcpConnection;
  onAdded: () => void;
}) {
  const add = useAddOpencodeMcpServer(connection);
  const [type, setType] = useState<"local" | "remote">("local");
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [argumentsText, setArgumentsText] = useState("");
  const [url, setUrl] = useState("");
  const [values, setValues] = useState("");
  const [oauthDisabled, setOauthDisabled] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let config: OpencodeMcpConfig;
    try {
      const entries = parseEntries(values);
      config =
        type === "local"
          ? {
              type: "local",
              command: [
                command.trim(),
                ...argumentsText
                  .split("\n")
                  .map((value) => value.trim())
                  .filter(Boolean),
              ],
              ...(Object.keys(entries).length ? { environment: entries } : {}),
            }
          : {
              type: "remote",
              url: url.trim(),
              ...(Object.keys(entries).length ? { headers: entries } : {}),
              ...(oauthDisabled ? { oauth: false as const } : {}),
            };
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid configuration",
      );
      return;
    }
    add.mutate(
      { name: name.trim(), config },
      {
        onSuccess: () => {
          toast.success(`${name.trim()} added`);
          onAdded();
        },
        onError: (error) =>
          toast.error(error.message || "Could not add MCP server"),
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="bg-card overflow-hidden rounded-xl border shadow-sm"
    >
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-medium">Add an MCP server</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Connect a local process or a hosted MCP endpoint to this workspace.
        </p>
      </div>
      <Tabs
        className="flex-col gap-0"
        value={type}
        onValueChange={(value) => setType(value as "local" | "remote")}
      >
        <TabsList className="bg-muted/50 mx-4 mt-4 grid h-10 w-auto grid-cols-2 gap-1 rounded-lg border p-1">
          <TabsTrigger
            value="local"
            className={
              type === "local"
                ? "bg-primary! text-primary-foreground! w-full shadow-sm"
                : "text-muted-foreground hover:text-foreground w-full bg-transparent! shadow-none!"
            }
          >
            Local command
          </TabsTrigger>
          <TabsTrigger
            value="remote"
            className={
              type === "remote"
                ? "bg-primary! text-primary-foreground! w-full shadow-sm"
                : "text-muted-foreground hover:text-foreground w-full bg-transparent! shadow-none!"
            }
          >
            Remote URL
          </TabsTrigger>
        </TabsList>
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="mcp-name">Server name</Label>
            <Input
              id="mcp-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="github"
              autoFocus
              required
            />
            <p className="text-muted-foreground text-xs">
              Use a short, unique name. OpenCode prefixes this server&apos;s
              tools with it.
            </p>
          </div>

          <TabsContent value="local" className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mcp-command">Command</Label>
              <Input
                id="mcp-command"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="npx"
                required={type === "local"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mcp-arguments">Arguments</Label>
              <Textarea
                id="mcp-arguments"
                className="min-h-20 font-mono text-xs"
                value={argumentsText}
                onChange={(event) => setArgumentsText(event.target.value)}
                placeholder={"-y\n@modelcontextprotocol/server-everything"}
              />
              <p className="text-muted-foreground text-xs">
                Enter one argument per line.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="remote" className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mcp-url">Server URL</Label>
              <Input
                id="mcp-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/mcp"
                required={type === "remote"}
              />
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">
                  API key authentication
                </span>
                <span className="text-muted-foreground block text-xs">
                  Turn on to disable automatic OAuth discovery.
                </span>
              </span>
              <Switch
                checked={oauthDisabled}
                onCheckedChange={(value) => setOauthDisabled(value === true)}
              />
            </label>
          </TabsContent>

          <div className="space-y-1.5 border-t pt-4">
            <Label htmlFor="mcp-values">
              {type === "local" ? "Environment variables" : "Request headers"}
              <span className="text-muted-foreground font-normal">
                Optional
              </span>
            </Label>
            <Textarea
              id="mcp-values"
              className="min-h-20 font-mono text-xs"
              value={values}
              onChange={(event) => setValues(event.target.value)}
              placeholder={
                type === "local"
                  ? "API_KEY=value"
                  : "Authorization=Bearer token"
              }
            />
            <p className="text-muted-foreground text-xs">
              Enter one KEY=value pair per line.
            </p>
          </div>
        </div>
      </Tabs>
      <div className="bg-muted/30 flex justify-end gap-2 border-t px-4 py-3">
        <Button type="button" variant="ghost" onClick={onAdded}>
          Cancel
        </Button>
        <Button type="submit" disabled={add.isPending}>
          {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Add
          server
        </Button>
      </div>
    </form>
  );
}

function parseEntries(value: string) {
  return Object.fromEntries(
    value
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator <= 0) throw new Error(`Expected KEY=value: ${line}`);
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim(),
        ];
      }),
  );
}
