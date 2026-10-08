"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type WorkspaceTool =
  "context" | "files" | "git" | "terminal" | "browser" | "domains" | "settings";

const TOOL_QUERY = "tool";
const HISTORY_KEY = "vibeongoWorkspaceBaseUrl";

function readTool(value: string | null): WorkspaceTool | null {
  switch (value) {
    case "context":
    case "files":
    case "git":
    case "terminal":
    case "browser":
    case "domains":
    case "settings":
      return value;
    default:
      return null;
  }
}

function relativeUrl(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function baseUrl(url: URL) {
  const base = new URL(url);
  base.searchParams.delete(TOOL_QUERY);
  return relativeUrl(base);
}

function ownsPanelEntry(url: URL) {
  return window.history.state?.[HISTORY_KEY] === baseUrl(url);
}

function ensurePanelEntry(url: URL) {
  if (ownsPanelEntry(url)) return;
  // A direct link needs a chat entry beneath it, so Back still closes the panel.
  const base = baseUrl(url);
  window.history.replaceState(null, "", base);
  window.history.pushState({ [HISTORY_KEY]: base }, "", relativeUrl(url));
}

export function useWorkspaceTool() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const active = readTool(searchParams.get(TOOL_QUERY));
  const closingRef = useRef(false);
  const [visited, setVisited] = useState<{
    pathname: string;
    tools: Partial<Record<WorkspaceTool, boolean>>;
  }>({ pathname, tools: {} });

  useEffect(() => {
    closingRef.current = false;
    setVisited((previous) => {
      const tools = previous.pathname === pathname ? previous.tools : {};
      if (previous.pathname === pathname && (!active || tools[active]))
        return previous;
      return { pathname, tools: active ? { ...tools, [active]: true } : tools };
    });
    if (!active) return;
    const url = new URL(window.location.href);
    // Do not alter history for a route which is already navigating away.
    if (
      url.pathname === pathname &&
      readTool(url.searchParams.get(TOOL_QUERY)) === active
    )
      ensurePanelEntry(url);
  }, [active, pathname, search]);

  const opened = useMemo(() => {
    const tools = visited.pathname === pathname ? visited.tools : {};
    return active ? { ...tools, [active]: true } : tools;
  }, [active, pathname, visited]);

  const openPanel = useCallback((tool: WorkspaceTool) => {
    if (closingRef.current) return;
    const url = new URL(window.location.href);
    const current = readTool(url.searchParams.get(TOOL_QUERY));
    if (current) ensurePanelEntry(url);
    else if (url.searchParams.has(TOOL_QUERY))
      window.history.replaceState(null, "", baseUrl(url));

    const base = baseUrl(url);
    url.searchParams.set(TOOL_QUERY, tool);
    // Switching tools replaces the overlay entry: one Back always returns to chat.
    if (current)
      window.history.replaceState(
        { [HISTORY_KEY]: base },
        "",
        relativeUrl(url),
      );
    else
      window.history.pushState({ [HISTORY_KEY]: base }, "", relativeUrl(url));
  }, []);

  const closePanel = useCallback(() => {
    if (closingRef.current) return;
    const url = new URL(window.location.href);
    if (!readTool(url.searchParams.get(TOOL_QUERY))) return;
    if (ownsPanelEntry(url)) {
      // Back is asynchronous. Repeated taps must not also navigate out of chat.
      closingRef.current = true;
      window.history.back();
    } else window.history.replaceState(null, "", baseUrl(url));
  }, []);

  const togglePanel = useCallback(
    (tool: WorkspaceTool) => {
      const current = readTool(
        new URL(window.location.href).searchParams.get(TOOL_QUERY),
      );
      if (current === tool) closePanel();
      else openPanel(tool);
    },
    [closePanel, openPanel],
  );

  const forgetPanel = useCallback((tool: WorkspaceTool) => {
    setVisited((previous) => ({
      ...previous,
      tools: { ...previous.tools, [tool]: false },
    }));
  }, []);

  return { active, opened, openPanel, closePanel, togglePanel, forgetPanel };
}
