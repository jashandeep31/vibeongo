"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createWorkspaceToolHistory,
  readWorkspaceTool,
  type WorkspaceTool,
} from "@/lib/workspace-tool-history";

export type { WorkspaceTool } from "@/lib/workspace-tool-history";

export function useWorkspaceTool() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serverUrl = `${pathname}?${searchParams.toString()}`;
  const history = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : createWorkspaceToolHistory(window, pathname),
    [pathname],
  );
  const href = useSyncExternalStore(
    history?.subscribe ?? (() => () => {}),
    history?.getSnapshot ?? (() => serverUrl),
    () => serverUrl,
  );
  const url = new URL(href, "https://workspace.local");
  const active =
    url.pathname === pathname
      ? readWorkspaceTool(url.searchParams.get("tool"))
      : null;
  const [visited, setVisited] = useState<{
    pathname: string;
    tools: Partial<Record<WorkspaceTool, boolean>>;
  }>({ pathname, tools: {} });

  useEffect(() => {
    history?.initialize();
    return () => history?.dispose();
  }, [history]);

  useEffect(() => {
    setVisited((previous) => {
      const tools = previous.pathname === pathname ? previous.tools : {};
      if (previous.pathname === pathname && (!active || tools[active]))
        return previous;
      return { pathname, tools: active ? { ...tools, [active]: true } : tools };
    });
  }, [active, pathname]);

  const opened = useMemo(() => {
    const tools = visited.pathname === pathname ? visited.tools : {};
    return active ? { ...tools, [active]: true } : tools;
  }, [active, pathname, visited]);
  const openPanel = useCallback(
    (tool: WorkspaceTool) => history?.open(tool),
    [history],
  );
  const closePanel = useCallback(() => history?.close(), [history]);
  const togglePanel = useCallback(
    (tool: WorkspaceTool) => history?.toggle(tool),
    [history],
  );
  const forgetPanel = useCallback((tool: WorkspaceTool) => {
    setVisited((previous) => ({
      ...previous,
      tools: { ...previous.tools, [tool]: false },
    }));
  }, []);

  return { active, opened, openPanel, closePanel, togglePanel, forgetPanel };
}
