import {
  createVibeongoWsV2Socket,
  requestVibeongoWsV2Token,
} from "@/lib/vibeongo-ws-v2";

export type TmuxPane = { name: string };
export type TmuxWindow = { id: string; name: string; panes: TmuxPane[] };
export type TmuxSession = { name: string; windows: TmuxWindow[] };
export type FavoriteDir = { name: string; path: string };
export type VibeongoTerminalSession =
  | {
      id: string;
      kind: "shell";
      name: string;
      workingDirectory: string;
      buffer?: string;
    }
  | {
      id: string;
      kind: "tmux";
      name: string;
      tmuxSessionName: string;
      tmuxWindowId: string;
      tmuxWindowName: string;
      buffer?: string;
    };

const TERMINAL_CREATION_TIMEOUT_MS = 10_000;

export async function createVibeongoTerminalSession({
  accessToken,
  localToken,
  runtimeUrl,
  workingDirectory,
}: {
  accessToken: string;
  localToken: string;
  runtimeUrl: string;
  workingDirectory?: string;
}) {
  return requestVibeongoTerminalSession({
    accessToken,
    localToken,
    runtimeUrl,
    workingDirectory,
  });
}

export async function attachVibeongoTmuxTerminalSession({
  accessToken,
  localToken,
  runtimeUrl,
  tmuxSessionName,
  tmuxWindowId,
}: {
  accessToken: string;
  localToken: string;
  runtimeUrl: string;
  tmuxSessionName: string;
  tmuxWindowId?: string;
}) {
  return requestVibeongoTerminalSession({
    accessToken,
    localToken,
    runtimeUrl,
    tmuxSessionName,
    tmuxWindowId,
  });
}

async function requestVibeongoTerminalSession({
  accessToken,
  localToken,
  runtimeUrl,
  tmuxSessionName,
  tmuxWindowId,
  workingDirectory,
}: {
  accessToken: string;
  localToken: string;
  runtimeUrl: string;
  tmuxSessionName?: string;
  tmuxWindowId?: string;
  workingDirectory?: string;
}) {
  const token = await requestVibeongoWsV2Token({
    accessToken,
    localToken,
    runtimeUrl,
  });

  return new Promise<string>((resolve, reject) => {
    const socket = createVibeongoWsV2Socket({
      accessToken,
      path: "/v2/ws/terminal/new",
      runtimeUrl,
      tmuxSessionName,
      tmuxWindowId,
      token,
      workingDirectory,
    });
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(new Error("Timed out while creating the terminal session"));
    }, TERMINAL_CREATION_TIMEOUT_MS);

    const finish = (result: { id: string } | { error: Error }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close(1000, "Terminal session created");
      if ("id" in result) resolve(result.id);
      else reject(result.error);
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        const message = JSON.parse(event.data) as {
          error?: unknown;
          id?: unknown;
          type?: unknown;
        };
        if (message.type === "session" && typeof message.id === "string") {
          finish({ id: message.id });
        } else if (message.type === "error") {
          finish({
            error: new Error(
              typeof message.error === "string"
                ? message.error
                : "Could not create terminal session",
            ),
          });
        }
      } catch {
        // Terminal output is not relevant while creating the session.
      }
    };
    socket.onerror = () =>
      finish({ error: new Error("Could not create terminal session") });
    socket.onclose = () => {
      if (!settled) {
        finish({ error: new Error("Terminal connection closed early") });
      }
    };
  });
}

export async function killVibeongoTerminalSession({
  accessToken,
  localToken,
  runtimeUrl,
  terminalId,
}: {
  accessToken: string;
  localToken: string;
  runtimeUrl: string;
  terminalId: string;
}) {
  const token = await requestVibeongoWsV2Token({
    accessToken,
    localToken,
    runtimeUrl,
  });

  return new Promise<void>((resolve, reject) => {
    const socket = createVibeongoWsV2Socket({
      accessToken,
      path: "/v2/ws",
      runtimeUrl,
      token,
    });
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error("Timed out while killing the terminal session"));
    }, TERMINAL_CREATION_TIMEOUT_MS);

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close(1000, "Terminal kill request completed");
      if (error) reject(error);
      else resolve();
    };

    socket.onopen = () => {
      try {
        socket.send(JSON.stringify({ type: "killTerminal", id: terminalId }));
      } catch {
        finish(new Error("Could not send terminal kill request"));
      }
    };
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        const message = JSON.parse(event.data) as {
          error?: unknown;
          id?: unknown;
          type?: unknown;
        };
        if (message.id !== terminalId) return;
        if (message.type === "terminalKilled") {
          finish();
        } else if (message.type === "terminalKillError") {
          finish(
            new Error(
              typeof message.error === "string"
                ? message.error
                : "Could not kill terminal session",
            ),
          );
        }
      } catch {
        // Ignore unrelated workspace messages.
      }
    };
    socket.onerror = () =>
      finish(new Error("Could not connect to kill terminal session"));
    socket.onclose = () => {
      if (!settled) finish(new Error("Terminal connection closed early"));
    };
  });
}

export function parseTmuxSessions(value: unknown): TmuxSession[] | null {
  if (!Array.isArray(value)) return null;

  const sessions: TmuxSession[] = [];
  for (const sessionValue of value) {
    if (
      !sessionValue ||
      typeof sessionValue !== "object" ||
      Array.isArray(sessionValue)
    ) {
      return null;
    }
    const session = sessionValue as Record<string, unknown>;
    if (typeof session.name !== "string" || !Array.isArray(session.windows)) {
      return null;
    }

    const windows: TmuxWindow[] = [];
    for (const windowValue of session.windows) {
      if (
        !windowValue ||
        typeof windowValue !== "object" ||
        Array.isArray(windowValue)
      ) {
        return null;
      }
      const window = windowValue as Record<string, unknown>;
      if (
        typeof window.id !== "string" ||
        typeof window.name !== "string" ||
        !Array.isArray(window.panes)
      ) {
        return null;
      }

      const panes: TmuxPane[] = [];
      for (const paneValue of window.panes) {
        if (
          !paneValue ||
          typeof paneValue !== "object" ||
          Array.isArray(paneValue) ||
          typeof (paneValue as Record<string, unknown>).name !== "string"
        ) {
          return null;
        }
        panes.push({
          name: (paneValue as Record<string, unknown>).name as string,
        });
      }
      windows.push({ id: window.id, name: window.name, panes });
    }
    sessions.push({ name: session.name, windows });
  }
  return sessions;
}

export function parseFavoriteDirs(value: unknown): FavoriteDir[] | null {
  if (!Array.isArray(value)) return null;

  const dirs: FavoriteDir[] = [];
  for (const dirValue of value) {
    if (!dirValue || typeof dirValue !== "object" || Array.isArray(dirValue)) {
      return null;
    }
    const dir = dirValue as Record<string, unknown>;
    if (
      typeof dir.name !== "string" ||
      !dir.name ||
      typeof dir.path !== "string" ||
      !dir.path
    ) {
      return null;
    }
    dirs.push({ name: dir.name, path: dir.path });
  }
  return dirs;
}

export function parseTerminalSessions(
  value: unknown,
): VibeongoTerminalSession[] | null {
  if (!Array.isArray(value)) return null;

  const sessions: VibeongoTerminalSession[] = [];
  for (const sessionValue of value) {
    if (
      !sessionValue ||
      typeof sessionValue !== "object" ||
      Array.isArray(sessionValue)
    ) {
      return null;
    }
    const session = sessionValue as Record<string, unknown>;
    if (typeof session.id !== "string" || typeof session.name !== "string") {
      return null;
    }
    if (session.kind === "shell") {
      if (typeof session.workingDirectory !== "string") return null;
      sessions.push({
        buffer: typeof session.buffer === "string" ? session.buffer : "",
        id: session.id,
        kind: "shell",
        name: session.name,
        workingDirectory: session.workingDirectory,
      });
      continue;
    }
    if (
      session.kind !== "tmux" ||
      typeof session.tmuxSessionName !== "string" ||
      typeof session.tmuxWindowId !== "string" ||
      typeof session.tmuxWindowName !== "string"
    ) {
      return null;
    }
    sessions.push({
      buffer: typeof session.buffer === "string" ? session.buffer : "",
      id: session.id,
      kind: "tmux",
      name: session.name,
      tmuxSessionName: session.tmuxSessionName,
      tmuxWindowId: session.tmuxWindowId,
      tmuxWindowName: session.tmuxWindowName,
    });
  }
  return sessions;
}
