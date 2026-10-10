export type WorkspaceTool =
  "context" | "files" | "git" | "terminal" | "browser" | "domains" | "settings";

const HISTORY_KEY = "vibeongoWorkspaceBaseUrl";
const CLOSE_TIMEOUT_MS = 1000;

export function readWorkspaceTool(value: string | null): WorkspaceTool | null {
  return value === "context" ||
    value === "files" ||
    value === "git" ||
    value === "terminal" ||
    value === "browser" ||
    value === "domains" ||
    value === "settings"
    ? value
    : null;
}

function relativeUrl(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function baseUrl(url: URL) {
  const base = new URL(url);
  base.searchParams.delete("tool");
  return relativeUrl(base);
}

// A delayed/ignored Back must never lock every workspace tool.
export function createWorkspaceToolHistory(browser: Window, pathname: string) {
  let pending:
    | {
        href: string;
        base: string;
        next: WorkspaceTool | null;
        timer: ReturnType<typeof setTimeout>;
      }
    | undefined;

  const currentUrl = () => new URL(browser.location.href);
  const ownsEntry = (url: URL) =>
    browser.history.state?.[HISTORY_KEY] === baseUrl(url);
  const write = (
    method: "pushState" | "replaceState",
    url: string,
    base?: string,
  ) => {
    // Preserve framework state even before Next installs its history wrapper.
    const state = { ...browser.history.state };
    delete state[HISTORY_KEY];
    if (base) state[HISTORY_KEY] = base;
    browser.history[method](state, "", url);
  };
  // Next bypasses its history wrapper for preserved __NA state. Notify it and
  // our external store explicitly, without waiting for search-param rendering.
  const notify = () =>
    browser.dispatchEvent(
      new PopStateEvent("popstate", { state: browser.history.state }),
    );

  const initialize = () => {
    const url = currentUrl();
    if (
      url.pathname !== pathname ||
      !readWorkspaceTool(url.searchParams.get("tool")) ||
      ownsEntry(url)
    )
      return;
    const base = baseUrl(url);
    write("replaceState", base);
    write("pushState", relativeUrl(url), base);
  };

  const open = (tool: WorkspaceTool) => {
    const url = currentUrl();
    if (url.pathname !== pathname) return;
    if (pending) {
      pending.next = tool;
      return;
    }
    const active = readWorkspaceTool(url.searchParams.get("tool"));
    if (active === tool) return;
    if (active) initialize();
    else if (url.searchParams.has("tool")) write("replaceState", baseUrl(url));
    const base = baseUrl(url);
    url.searchParams.set("tool", tool);
    write(active ? "replaceState" : "pushState", relativeUrl(url), base);
    notify();
  };

  const finishClose = () => {
    if (!pending) return;
    const closing = pending;
    pending = undefined;
    clearTimeout(closing.timer);
    const url = currentUrl();
    // Never overwrite another route or an unrelated history traversal.
    if (url.pathname !== pathname || baseUrl(url) !== closing.base) return;
    if (browser.location.href === closing.href) {
      write("replaceState", closing.base);
      notify();
    }
    if (closing.next) open(closing.next);
  };

  const close = () => {
    const url = currentUrl();
    if (
      pending ||
      url.pathname !== pathname ||
      !readWorkspaceTool(url.searchParams.get("tool"))
    )
      return;
    if (!ownsEntry(url)) {
      write("replaceState", baseUrl(url));
      notify();
      return;
    }
    pending = {
      href: browser.location.href,
      base: baseUrl(url),
      next: null,
      timer: setTimeout(finishClose, CLOSE_TIMEOUT_MS),
    };
    try {
      browser.history.back();
    } catch {
      finishClose();
    }
  };

  return {
    initialize,
    open,
    close,
    toggle(tool: WorkspaceTool) {
      if (pending) pending.next = pending.next === tool ? null : tool;
      else if (
        readWorkspaceTool(currentUrl().searchParams.get("tool")) === tool
      )
        close();
      else open(tool);
    },
    subscribe(listener: () => void) {
      const onPopState = () => {
        finishClose();
        listener();
      };
      browser.addEventListener("popstate", onPopState);
      return () => browser.removeEventListener("popstate", onPopState);
    },
    getSnapshot: () => browser.location.href,
    dispose() {
      if (pending) clearTimeout(pending.timer);
      pending = undefined;
    },
  };
}
