"use client";

import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { ArrowLeft, ChevronRight, Plus, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

type TerminalSessionsResponse = {
  type: "sessionIds";
  ids: string[];
  activeId: string;
};

type TmuxSessionsResponse = {
  type: "tmuxSessions";
  sessions: Array<{
    name: string;
    windows: Array<{
      name: string;
      panes: Array<{ name: string }>;
    }>;
  }>;
};

const INITIAL_TERMINAL_SESSIONS: TerminalSessionsResponse = {
  type: "sessionIds",
  ids: ["terminal-1", "terminal-2", "terminal-3"],
  activeId: "terminal-1",
};

const INITIAL_TMUX_SESSIONS: TmuxSessionsResponse = {
  type: "tmuxSessions",
  sessions: [
    {
      name: "dev",
      windows: [
        {
          name: "app",
          panes: [{ name: "0" }, { name: "1" }],
        },
        {
          name: "server",
          panes: [{ name: "0" }],
        },
      ],
    },
    {
      name: "ops",
      windows: [
        {
          name: "opencode",
          panes: [{ name: "0" }],
        },
      ],
    },
  ],
};

export function ProjectTerminalPage({
  projectId,
  projectSessionId,
}: {
  projectId: string;
  projectSessionId: string;
}) {
  const router = useRouter();
  const [terminalSessions, setTerminalSessions] = useState(
    INITIAL_TERMINAL_SESSIONS,
  );
  const [tmuxSessions, setTmuxSessions] = useState(INITIAL_TMUX_SESSIONS);
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const sessionName = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.session.name ?? "Session",
  );

  const addTerminalSession = () => {
    setTerminalSessions((current) => ({
      ...current,
      ids: [...current.ids, `terminal-${current.ids.length + 1}`],
    }));
  };

  const addTmuxSession = () => {
    setTmuxSessions((current) => ({
      ...current,
      sessions: [
        ...current.sessions,
        {
          name: `session-${current.sessions.length + 1}`,
          windows: [],
        },
      ],
    }));
  };

  const addWindow = (sessionName: string) => {
    setTmuxSessions((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.name === sessionName
          ? {
              ...session,
              windows: [
                ...session.windows,
                {
                  name: `window-${session.windows.length + 1}`,
                  panes: [],
                },
              ],
            }
          : session,
      ),
    }));
  };

  const addPane = (sessionName: string, windowName: string) => {
    setTmuxSessions((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.name === sessionName
          ? {
              ...session,
              windows: session.windows.map((window) =>
                window.name === windowName
                  ? {
                      ...window,
                      panes: [
                        ...window.panes,
                        { name: String(window.panes.length) },
                      ],
                    }
                  : window,
              ),
            }
          : session,
      ),
    }));
  };

  return (
    <div className="bg-background text-foreground flex h-svh min-h-0 w-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Go back"
          title="Go back"
          onClick={() => router.back()}
        >
          <ArrowLeft />
        </Button>
        <Terminal className="text-muted-foreground size-4 shrink-0" />
        <h1 className="min-w-0 truncate text-sm font-semibold">
          {projectName} · {sessionName} · Terminal
        </h1>
      </header>

      <main
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        aria-label="Terminal workspace"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <section aria-labelledby="terminal-sessions-heading">
            <SectionHeading
              action={
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="New terminal session"
                  title="New terminal session"
                  onClick={addTerminalSession}
                >
                  <Plus />
                </Button>
              }
              count={terminalSessions.ids.length}
              eventType={terminalSessions.type}
              id="terminal-sessions-heading"
              title="Terminal sessions"
            />
            <div className="flex flex-wrap gap-3">
              {terminalSessions.ids.map((terminalId, index) => {
                const isActive = terminalId === terminalSessions.activeId;

                return (
                  <div
                    key={terminalId}
                    className={`flex aspect-square w-36 flex-col justify-between rounded-xl border p-4 ${
                      isActive ? "border-emerald-500/50 bg-emerald-500/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                        <Terminal className="size-4" />
                      </span>
                      {isActive ? (
                        <span
                          className="size-2 rounded-full bg-emerald-500"
                          aria-label="Active"
                        />
                      ) : null}
                    </div>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        Terminal {index + 1}
                      </span>
                      <span className="text-muted-foreground block truncate font-mono text-xs">
                        {terminalId}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="tmux-sessions-heading">
            <SectionHeading
              action={
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="New tmux session"
                  title="New tmux session"
                  onClick={addTmuxSession}
                >
                  <Plus />
                </Button>
              }
              count={tmuxSessions.sessions.length}
              eventType={tmuxSessions.type}
              id="tmux-sessions-heading"
              title="Tmux sessions"
            />
            <div className="space-y-3">
              {tmuxSessions.sessions.map((tmuxSession) => (
                <div
                  key={tmuxSession.name}
                  className="overflow-hidden rounded-xl border"
                >
                  <div className="bg-muted/40 flex items-center gap-3 border-b px-4 py-3">
                    <Terminal className="text-muted-foreground size-4" />
                    <span className="font-mono text-sm font-semibold">
                      {tmuxSession.name}
                    </span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {tmuxSession.windows.length}{" "}
                      {tmuxSession.windows.length === 1 ? "window" : "windows"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`New window in ${tmuxSession.name}`}
                      title="New window"
                      onClick={() => addWindow(tmuxSession.name)}
                    >
                      <Plus />
                    </Button>
                  </div>
                  <div className="divide-y">
                    {tmuxSession.windows.map((window) => (
                      <div
                        key={`${tmuxSession.name}-${window.name}`}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                          <span className="truncate text-sm font-medium">
                            {window.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                          {window.panes.map((pane) => (
                            <span
                              key={`${tmuxSession.name}-${window.name}-${pane.name}`}
                              className="bg-secondary text-secondary-foreground rounded-md px-2.5 py-1 font-mono text-xs"
                            >
                              Pane {pane.name}
                            </span>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={`New pane in ${tmuxSession.name}/${window.name}`}
                            title="New pane"
                            onClick={() =>
                              addPane(tmuxSession.name, window.name)
                            }
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SectionHeading({
  action,
  count,
  eventType,
  id,
  title,
}: {
  action: ReactNode;
  count: number;
  eventType: TerminalSessionsResponse["type"] | TmuxSessionsResponse["type"];
  id: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
        {count}
      </span>
      <code className="text-muted-foreground ml-auto text-xs">
        {eventType}
      </code>
      {action}
    </div>
  );
}
