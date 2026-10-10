"use client";

import {
  BROWSER_TABS_TTL,
  browserTabsStorageKey,
  cleanupExpiredBrowserTabs,
  emptyBrowserTabs,
  readBrowserTabs,
  writeBrowserTabs,
  type BrowserTab,
  type BrowserTabsSession,
} from "@/lib/browser-tabs-storage";
import {
  useGetProjectDomainsById,
  useGetInstances,
  useCurrentUserIp,
  useAddAllowedIpToProject,
} from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  ExternalLink,
  Globe,
  Network,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const ProjectBrowserPanel = memo(function ProjectBrowserPanel({
  projectId,
  projectSessionId,
  sessionId,
  isActive,
  onClose,
  onOpenDomains,
}: {
  projectId: string;
  projectSessionId: string;
  sessionId?: string;
  isActive: boolean;
  onClose: () => void;
  onOpenDomains: () => void;
}) {
  // Include the project and runtime session so tabs never leak across chats.
  const scope = `${projectId}:${projectSessionId}:${sessionId ?? "new"}`;
  return (
    <BrowserWorkspace
      key={scope}
      scope={scope}
      projectId={projectId}
      projectSessionId={projectSessionId}
      isActive={isActive}
      onClose={onClose}
      onOpenDomains={onOpenDomains}
    />
  );
});

function BrowserWorkspace({
  scope,
  projectId,
  projectSessionId,
  isActive,
  onClose,
  onOpenDomains,
}: {
  scope: string;
  projectId: string;
  projectSessionId: string;
  isActive: boolean;
  onClose: () => void;
  onOpenDomains: () => void;
}) {
  const [session, setSession] = useState(() => emptyBrowserTabs(scope));
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [manualIp, setManualIp] = useState("");
  const [filter, setFilter] = useState("");
  const [visited, setVisited] = useState<string[]>([]);
  const [navigation, setNavigation] = useState<
    Record<string, { entries: string[]; index: number }>
  >({});
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [reloads, setReloads] = useState<Record<string, number>>({});
  const tabStrip = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  const persistenceAvailable = useRef(true);
  const storedInstance = useSessionsStore(
    (state) =>
      state.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.instance,
  );
  const instancesQuery = useGetInstances(
    { sessionId: projectSessionId, state: "running", limit: 1 },
    isActive && !storedInstance,
  );
  const instance = storedInstance ?? instancesQuery.data?.data[0];
  const instanceId = instance?.id;
  const domainQuery = useGetProjectDomainsById(projectId, isActive);
  const domains = useMemo(
    () =>
      [...(domainQuery.data?.proxy_domains ?? [])].sort(
        (a, b) =>
          a.target_port - b.target_port || a.domain.localeCompare(b.domain),
      ),
    [domainQuery.data?.proxy_domains],
  );
  const runtimeIpDomain = instance
    ? `3101-${instance.id}${instance.proxy_domain}`
    : undefined;
  const ipDomain =
    domains.find((domain) => domain.target_port === 3101)?.domain ??
    runtimeIpDomain;
  const ipQuery = useCurrentUserIp(isActive ? ipDomain : undefined);
  const addAllowedIp = useAddAllowedIpToProject();
  const currentIp = ipQuery.data?.trim() || manualIp.trim();
  const isIpAllowed =
    !!currentIp &&
    !!domainQuery.data?.allowed_ips.some(
      (entry) => entry.ip.trim() === currentIp,
    );
  const allowCurrentIp = () => {
    if (!currentIp || isIpAllowed || addAllowedIp.isPending) return;
    addAllowedIp.mutate({ id: projectId, ip: currentIp });
  };
  const selected = session.tabs.find((tab) => tab.id === session.activeTabId);
  const selectedHistory = selected ? navigation[selected.id] : undefined;
  const previewUrl = selectedHistory
    ? (selectedHistory.entries[selectedHistory.index] ?? "")
    : (selected?.url ?? "");
  const canGoBack = !!selectedHistory && selectedHistory.index > 0;
  const canGoForward =
    !!selectedHistory &&
    selectedHistory.index < selectedHistory.entries.length - 1;

  useEffect(() => {
    setAddress(previewUrl);
    setAddressError("");
  }, [previewUrl, selected?.id]);

  const recordNavigation = (tabId: string, url: string, initialUrl = "") => {
    setNavigation((previous) => {
      const current = previous[tabId] ?? { entries: [initialUrl], index: 0 };
      if (current.entries[current.index] === url) return previous;
      const entries = [...current.entries.slice(0, current.index + 1), url];
      return { ...previous, [tabId]: { entries, index: entries.length - 1 } };
    });
  };
  const goHistory = (offset: number) => {
    if (!selected || !selectedHistory) return;
    const index = selectedHistory.index + offset;
    if (index < 0 || index >= selectedHistory.entries.length) return;
    const url = selectedHistory.entries[index] ?? "";
    const domain = url
      ? domains.find(
          (entry) =>
            new URL(`https://${entry.domain}`).origin === new URL(url).origin,
        )
      : undefined;
    if (url && !domain) {
      setAddressError("This domain is no longer available in the project.");
      return;
    }
    setNavigation((previous) => ({
      ...previous,
      [selected.id]: { ...selectedHistory, index },
    }));
    commit({
      ...session,
      tabs: session.tabs.map((tab) =>
        tab.id === selected.id
          ? {
              ...tab,
              domainId: domain?.id ?? null,
              url: domain ? `https://${domain.domain}/` : "",
              title: domain?.domain ?? "New tab",
            }
          : tab,
      ),
    });
  };
  const navigateAddress = () => {
    try {
      const url = new URL(
        address.includes("://") ? address.trim() : `https://${address.trim()}`,
      );
      const domain = domains.find(
        (entry) => new URL(`https://${entry.domain}`).origin === url.origin,
      );
      if (url.protocol !== "https:" || url.username || url.password || !domain)
        throw new Error(
          "Enter an HTTPS address on one of this project's domains.",
        );
      const tab: BrowserTab = {
        id: selected?.id ?? crypto.randomUUID(),
        domainId: domain.id,
        // Persist only the domain root. Path/query history stays in memory.
        url: `https://${domain.domain}/`,
        title: domain.domain,
      };
      recordNavigation(tab.id, url.href, previewUrl);
      commit({
        ...session,
        tabs: selected
          ? session.tabs.map((entry) => (entry.id === tab.id ? tab : entry))
          : [...session.tabs, tab],
        activeTabId: tab.id,
      });
      setAddressError("");
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : "Enter a valid project domain address.",
      );
    }
  };

  useEffect(() => {
    if (isActive)
      tabStrip.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [isActive, session.activeTabId]);

  const commit = useCallback((next: BrowserTabsSession, renew = true) => {
    const updated = {
      ...next,
      expiresAt: renew ? Date.now() + BROWSER_TABS_TTL : next.expiresAt,
    };
    setSession(updated);
    persistenceAvailable.current = writeBrowserTabs(updated);
    setStorageUnavailable(!persistenceAvailable.current);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    cleanupExpiredBrowserTabs();
    // Keep live tabs on reopen when storage is blocked.
    if (loaded.current && !persistenceAvailable.current) return;
    loaded.current = true;
    const restored = readBrowserTabs(scope);
    // A panel visit renews existing tabs; an expired entry stays empty.
    if (restored.tabs.length) commit(restored);
    else setSession(restored);
  }, [scope, isActive, commit]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === browserTabsStorageKey(scope) || event.key === null) {
        setNavigation({});
        setSession(readBrowserTabs(scope));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [scope]);

  useEffect(() => {
    if (!session.expiresAt) return;
    const expire = () => {
      const current = readBrowserTabs(scope);
      setSession(current);
      if (!current.tabs.length) {
        setVisited([]);
        setReloads({});
        setNavigation({});
      }
    };
    const timer = window.setTimeout(
      expire,
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [scope, session.expiresAt]);

  // Validate restored addresses against the API before mounting any iframe.
  // A domain removed or renamed by the project cannot remain as a stale tab.
  useEffect(() => {
    if (!domainQuery.isSuccess || !loaded.current) return;
    const tabs = session.tabs.filter(
      (tab) =>
        tab.domainId === null ||
        domains.some(
          (domain) =>
            domain.id === tab.domainId &&
            `https://${domain.domain}/` === tab.url,
        ),
    );
    if (tabs.length !== session.tabs.length) {
      commit(
        {
          ...session,
          tabs,
          activeTabId: tabs.some((tab) => tab.id === session.activeTabId)
            ? session.activeTabId
            : (tabs[0]?.id ?? null),
        },
        false,
      );
    }
  }, [domains, domainQuery.isSuccess, session, commit]);

  useEffect(() => {
    if (
      isActive &&
      selected?.domainId &&
      domainQuery.isSuccess &&
      domains.some(
        (domain) =>
          domain.id === selected.domainId &&
          `https://${domain.domain}/` === selected.url,
      )
    ) {
      setVisited((previous) =>
        previous.includes(selected.id) ? previous : [...previous, selected.id],
      );
    }
  }, [selected, isActive, domainQuery.isSuccess, domains]);

  const newTab = () => {
    const tab: BrowserTab = {
      id: crypto.randomUUID(),
      domainId: null,
      url: "",
      title: "New tab",
    };
    setFilter("");
    commit({ ...session, tabs: [...session.tabs, tab], activeTabId: tab.id });
  };
  const openDomain = (domain: (typeof domains)[number]) => {
    const tab: BrowserTab = {
      id: selected && !previewUrl ? selected.id : crypto.randomUUID(),
      domainId: domain.id,
      url: `https://${domain.domain}/`,
      title: domain.domain,
    };
    recordNavigation(tab.id, tab.url);
    const tabs = session.tabs.some((entry) => entry.id === tab.id)
      ? session.tabs.map((entry) => (entry.id === tab.id ? tab : entry))
      : [...session.tabs, tab];
    commit({ ...session, tabs, activeTabId: tab.id });
  };
  const closeTab = (id: string) => {
    const index = session.tabs.findIndex((tab) => tab.id === id);
    const tabs = session.tabs.filter((tab) => tab.id !== id);
    commit({
      ...session,
      tabs,
      activeTabId:
        session.activeTabId === id
          ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? null)
          : session.activeTabId,
    });
    setVisited((previous) => previous.filter((tabId) => tabId !== id));
    setNavigation((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setReloads((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };
  const filteredDomains = domains.filter((domain) =>
    `${domain.domain} ${domain.target_port}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );
  const needsAssignment =
    !!instanceId &&
    !!domainQuery.data &&
    domainQuery.data.target_instance_id !== instanceId;

  return (
    <aside
      aria-label="Browser"
      className="bg-background flex h-full min-h-0 min-w-0 flex-col"
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
        <Globe className="size-4 shrink-0" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">Browser</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open domains panel"
          title="Domains"
          onClick={onOpenDomains}
        >
          <Network />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh domains"
          title="Refresh domains"
          disabled={domainQuery.isFetching}
          onClick={() => void domainQuery.refetch()}
        >
          <RefreshCw className={cn(domainQuery.isFetching && "animate-spin")} />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close browser panel"
          title="Close browser"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>
      <div className="flex min-h-9 min-w-0 shrink-0 items-center border-b">
        <div
          ref={tabStrip}
          role="tablist"
          aria-label="Browser tabs"
          className="flex min-w-0 overflow-x-auto"
        >
          {session.tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "flex min-w-0 shrink-0 items-center border-r",
                tab.id === selected?.id && "bg-muted",
              )}
            >
              <button
                type="button"
                role="tab"
                id={`browser-tab-${tab.id}`}
                aria-controls={`browser-preview-${tab.id}`}
                aria-selected={tab.id === selected?.id}
                tabIndex={tab.id === selected?.id ? 0 : -1}
                className="focus-visible:outline-ring flex max-w-48 items-center gap-2 px-3 py-2 text-xs focus-visible:outline-2"
                title={tab.title}
                onClick={() => {
                  setFilter("");
                  commit({ ...session, activeTabId: tab.id });
                }}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const index = session.tabs.indexOf(tab);
                  const next =
                    session.tabs[
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? session.tabs.length - 1
                          : (index +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              session.tabs.length) %
                            session.tabs.length
                    ];
                  if (next) {
                    commit({ ...session, activeTabId: next.id });
                    document.getElementById(`browser-tab-${next.id}`)?.focus();
                  }
                }}
              >
                <Globe className="size-3 shrink-0" />
                <span className="truncate">{tab.title}</span>
              </button>
              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-ring mr-1 rounded-sm p-1 focus-visible:outline-2"
                onClick={() => closeTab(tab.id)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mx-1 shrink-0"
          aria-label="New browser tab"
          title="New tab"
          onClick={newTab}
        >
          <Plus />
        </Button>
      </div>
      {storageUnavailable && (
        <p
          role="status"
          className="text-muted-foreground border-b px-3 py-2 text-xs"
        >
          Tabs work here, but this browser could not save them for later.
        </p>
      )}
      {needsAssignment && (
        <p role="status" className="border-b px-3 py-2 text-xs">
          These domains currently route to another session. Use the domain
          button above to assign them here.
        </p>
      )}
      <form
        className="flex h-10 shrink-0 items-center gap-1 border-b px-1"
        onSubmit={(event) => {
          event.preventDefault();
          navigateAddress();
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Go back"
          title="Back"
          disabled={!canGoBack}
          onClick={() => goHistory(-1)}
        >
          <ArrowLeft />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Go forward"
          title="Forward"
          disabled={!canGoForward}
          onClick={() => goHistory(1)}
        >
          <ArrowRight />
        </Button>
        <input
          aria-label="Browser address"
          className="text-muted-foreground focus-visible:ring-ring h-7 min-w-0 flex-1 rounded-sm bg-transparent px-1 text-xs outline-none focus-visible:ring-2"
          value={address}
          placeholder="Enter a project domain address"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setAddress(event.target.value)}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          disabled={!selected || !previewUrl}
          aria-label="Reload preview"
          title="Reload preview"
          onClick={() => {
            if (!selected) return;
            setReloads((previous) => ({
              ...previous,
              [selected.id]: (previous[selected.id] ?? 0) + 1,
            }));
            commit(session);
          }}
        >
          <RefreshCw />
        </Button>
        {previewUrl ? (
          <Button asChild variant="ghost" size="icon-sm">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open preview externally"
              title="Open externally"
            >
              <ExternalLink />
            </a>
          </Button>
        ) : null}
      </form>
      {addressError ? (
        <p role="alert" className="text-destructive px-2 py-1 text-xs">
          {addressError}
        </p>
      ) : null}
      <div className="relative min-h-0 flex-1">
        {(isActive ? session.tabs : [])
          .filter(
            (tab) =>
              tab.domainId !== null &&
              visited.includes(tab.id) &&
              domains.some(
                (domain) =>
                  domain.id === tab.domainId &&
                  `https://${domain.domain}/` === tab.url,
              ),
          )
          .map((tab) => (
            <div
              key={tab.id}
              id={`browser-preview-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`browser-tab-${tab.id}`}
              className={cn(
                "absolute inset-0",
                (tab.id !== selected?.id || !previewUrl) && "hidden",
              )}
            >
              <iframe
                key={`${navigation[tab.id]?.entries[navigation[tab.id]!.index] || tab.url}:${reloads[tab.id] ?? 0}`}
                src={
                  navigation[tab.id]?.entries[navigation[tab.id]!.index] ||
                  tab.url
                }
                title={`Preview of ${tab.title}`}
                className="h-full w-full border-0 bg-white"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        {!previewUrl ? (
          <div
            id={selected ? `browser-preview-${selected.id}` : undefined}
            role={selected ? "tabpanel" : undefined}
            aria-labelledby={
              selected ? `browser-tab-${selected.id}` : undefined
            }
            className="flex h-full min-h-0 flex-col"
          >
            <div className="shrink-0 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Open a domain</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={allowCurrentIp}
                  disabled={
                    !currentIp ||
                    isIpAllowed ||
                    addAllowedIp.isPending ||
                    domainQuery.isPending ||
                    ipQuery.isFetching
                  }
                  title={
                    currentIp
                      ? `Allow ${currentIp} to access this project`
                      : "Detecting your public IP"
                  }
                >
                  {addAllowedIp.isPending || ipQuery.isFetching ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : isIpAllowed ? (
                    <Check className="size-3.5" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )}
                  {addAllowedIp.isPending
                    ? "Allowing…"
                    : isIpAllowed
                      ? "IP allowed"
                      : "Allow IP"}
                </Button>
              </div>
              {(!ipDomain ||
                ipQuery.isError ||
                (ipQuery.isSuccess && !ipQuery.data?.trim())) && (
                <label className="mb-3 block space-y-1 text-xs">
                  <span className="text-muted-foreground">
                    Could not detect your IP. Enter your public IP to allow
                    access.
                  </span>
                  <input
                    aria-label="Public IP address"
                    placeholder="Public IP address"
                    value={manualIp}
                    onChange={(event) => setManualIp(event.target.value)}
                    className="border-input bg-background focus-visible:ring-ring h-8 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
                  />
                </label>
              )}
              {addAllowedIp.isError && (
                <p role="alert" className="text-destructive mb-3 text-xs">
                  {addAllowedIp.error?.message ||
                    "Could not allow this IP. Try again."}
                </p>
              )}
              {addAllowedIp.isSuccess && (
                <p role="status" className="text-muted-foreground mb-3 text-xs">
                  Your IP has been added to this project&apos;s allowlist.
                </p>
              )}

              <label className="relative block">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <input
                  aria-label="Search domains or ports"
                  placeholder="Search domains or ports…"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="border-input bg-background focus-visible:ring-ring h-8 w-full rounded-md border pr-2 pl-8 text-sm outline-none focus-visible:ring-2"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {domainQuery.isPending ? (
                <p
                  role="status"
                  className="text-muted-foreground flex items-center gap-2 p-3 text-sm"
                >
                  <Loader2 className="size-4 animate-spin" />
                  Loading domains…
                </p>
              ) : domainQuery.isError ? (
                <div role="alert" className="p-3 text-sm">
                  <p>Could not load domains.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void domainQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              ) : filteredDomains.length ? (
                filteredDomains.map((domain) => (
                  <button
                    key={domain.id}
                    type="button"
                    className="hover:bg-muted focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-left outline-none focus-visible:ring-2"
                    onClick={() => openDomain(domain)}
                    title={domain.domain}
                  >
                    <Globe className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {domain.domain}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      :{domain.target_port}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground p-3 text-sm">
                  {domains.length
                    ? "No matching domains."
                    : "No domains are available for this project yet."}
                </p>
              )}
            </div>
          </div>
        ) : domainQuery.isPending ? (
          <p role="status" className="text-muted-foreground p-4 text-sm">
            Loading preview…
          </p>
        ) : domainQuery.isError ? (
          <p role="alert" className="p-4 text-sm">
            Could not verify this domain. Refresh domains to try again.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
