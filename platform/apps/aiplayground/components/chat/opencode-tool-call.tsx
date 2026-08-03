"use client";

import type { ToolPart } from "@opencode-ai/sdk/v2/client";
import { ChevronDown, ExternalLink } from "lucide-react";

export function OpencodeToolCall({ tools }: { tools: ToolPart[] }) {
  const firstTool = tools[0];
  if (!firstTool) return null;

  const isWebfetchGroup = tools.every((tool) => tool.tool === "webfetch");
  if (isWebfetchGroup) {
    return (
      <div className="space-y-1 py-1 text-sm">
        {tools.map((tool) => {
          const url = getSafeWebUrl(getStringInput(tool, "url"));

          return (
            <div key={tool.id} className="flex min-w-0 items-center gap-2 py-1">
              <span className="text-foreground shrink-0 font-medium">
                Webfetch
              </span>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-blue-600 hover:underline dark:text-blue-400"
                >
                  {url}
                </a>
              ) : (
                <span className="text-muted-foreground truncate">
                  Unknown URL
                </span>
              )}
              {url ? (
                <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const isSearchGroup = tools.every((tool) => tool.tool === "glob");

  return (
    <details className="group/tool text-sm">
      <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
        {isSearchGroup ? (
          <>
            <span>Explored</span>
            <span className="text-muted-foreground font-normal">
              {tools.length} {tools.length === 1 ? "search" : "searches"}
            </span>
          </>
        ) : (
          <span>{getToolName(firstTool)}</span>
        )}
        <ChevronDown className="text-muted-foreground size-3 transition-transform group-open/tool:rotate-180" />
      </summary>

      {isSearchGroup ? (
        <div className="space-y-2 pb-3 pl-3">
          {tools.map((tool) => (
            <div key={tool.id} className="flex min-w-0 items-center gap-2">
              <span className="font-medium">Glob</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground truncate">
                pattern={getStringInput(tool, "pattern")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <ToolResult tool={firstTool} />
      )}
    </details>
  );
}

function ToolResult({ tool }: { tool: ToolPart }) {
  const state = tool.state;

  if (tool.tool === "bash") {
    const command = getStringInput(tool, "command");
    const result =
      state.status === "completed"
        ? state.output
        : state.status === "error"
          ? state.error
          : "Running…";

    return (
      <pre className="border-border max-h-72 overflow-auto rounded-lg border p-4 font-mono text-xs leading-6 whitespace-pre-wrap">
        {command ? `$ ${command}\n\n` : ""}
        {result}
      </pre>
    );
  }

  return (
    <div className="border-border space-y-3 rounded-lg border p-4">
      <pre className="overflow-auto text-xs break-words whitespace-pre-wrap">
        {JSON.stringify(state.input, null, 2)}
      </pre>
      {state.status === "completed" ? (
        <pre className="max-h-72 overflow-auto text-xs break-words whitespace-pre-wrap">
          {state.output}
        </pre>
      ) : null}
      {state.status === "error" ? (
        <pre className="text-destructive max-h-72 overflow-auto text-xs break-words whitespace-pre-wrap">
          {state.error}
        </pre>
      ) : null}
      {state.status === "pending" || state.status === "running" ? (
        <div className="text-muted-foreground text-xs">Running…</div>
      ) : null}
    </div>
  );
}

function getToolName(tool: ToolPart) {
  if (tool.tool === "bash") return "Shell";

  const title = "title" in tool.state ? tool.state.title : undefined;
  return title || `${tool.tool.charAt(0).toUpperCase()}${tool.tool.slice(1)}`;
}

function getStringInput(tool: ToolPart, key: string) {
  const value = tool.state.input[key];
  return typeof value === "string" ? value : "";
}

function getSafeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
