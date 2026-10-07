export type BrowserTab = {
  id: string;
  domainId: string | null;
  url: string;
  title: string;
};

export type BrowserTabsSession = {
  version: 1;
  sessionId: string;
  expiresAt: number;
  activeTabId: string | null;
  tabs: BrowserTab[];
};

export const BROWSER_TABS_TTL = 48 * 60 * 60 * 1000;
const PREFIX = "vibeongo-browser-tabs:v1:";
export const browserTabsStorageKey = (sessionId: string) =>
  `${PREFIX}${sessionId}`;

export function emptyBrowserTabs(sessionId: string): BrowserTabsSession {
  return { version: 1, sessionId, expiresAt: 0, activeTabId: null, tabs: [] };
}

function parseSession(raw: string | null): BrowserTabsSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as BrowserTabsSession;
    if (
      value.version !== 1 ||
      typeof value.sessionId !== "string" ||
      !Number.isFinite(value.expiresAt) ||
      !Array.isArray(value.tabs) ||
      !(value.activeTabId === null || typeof value.activeTabId === "string")
    )
      return null;
    const ids = new Set<string>();
    for (const tab of value.tabs) {
      if (
        !tab ||
        typeof tab.id !== "string" ||
        ids.has(tab.id) ||
        typeof tab.title !== "string" ||
        typeof tab.url !== "string" ||
        !(tab.domainId === null || typeof tab.domainId === "string")
      )
        return null;
      ids.add(tab.id);
      if (tab.domainId === null) {
        if (tab.url !== "") return null;
      } else {
        const url = new URL(tab.url);
        // Persist only routed domain addresses, without credentials or tokens.
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          url.pathname !== "/"
        )
          return null;
      }
    }
    return {
      ...value,
      activeTabId: ids.has(value.activeTabId ?? "")
        ? value.activeTabId
        : (value.tabs[0]?.id ?? null),
    };
  } catch {
    return null;
  }
}

// Only clean up this feature's keys. Storage can be unavailable in private mode.
export function cleanupExpiredBrowserTabs(now = Date.now()): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(PREFIX)) continue;
      const stored = parseSession(localStorage.getItem(key));
      if (!stored || stored.expiresAt <= now) localStorage.removeItem(key);
    }
  } catch {
    /* The browser still works without persistence. */
  }
}

export function readBrowserTabs(sessionId: string): BrowserTabsSession {
  cleanupExpiredBrowserTabs();
  try {
    const stored = parseSession(
      localStorage.getItem(browserTabsStorageKey(sessionId)),
    );
    return stored?.sessionId === sessionId
      ? stored
      : emptyBrowserTabs(sessionId);
  } catch {
    return emptyBrowserTabs(sessionId);
  }
}

export function writeBrowserTabs(value: BrowserTabsSession): boolean {
  try {
    localStorage.setItem(
      browserTabsStorageKey(value.sessionId),
      JSON.stringify(value),
    );
    return true;
  } catch {
    return false;
  }
}
