"use client";

import { normalizeOpencodeFilePath } from "@/components/chat/opencode-file-diff";
import { OpencodeReviewDiff } from "@/components/chat/opencode-review-diff";
import { WorkerPoolContextProvider } from "@pierre/diffs/react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@repo/ui/components/resizable";
import type { SnapshotFileDiff } from "@repo/api-client";
import {
  useInitializeOpencodeGit,
  useOpencodeReviewProjectVcs,
  useOpencodeWorkingChanges,
} from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Columns2,
  FileCode2,
  GitCompareArrows,
  RefreshCw,
  Search,
  Rows3,
  X,
} from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";

type DiffStyle = "unified" | "split";

const DIFF_STYLE_KEY = "vibeongo-opencode-review-diff-style";

export const OpencodeReviewPanel = memo(function OpencodeReviewPanel({
  changes,
  isRefreshing,
  mode,
  onModeChange,
  changesError,
  chatUrl,
  onRefresh,
  onClose,
  isActive = true,
  gitConnection,
}: {
  changes: SnapshotFileDiff[];
  isRefreshing?: boolean;
  mode?: "working" | "last-turn";
  onModeChange?: (mode: "working" | "last-turn") => void;
  changesError?: string;
  chatUrl: string;
  onRefresh?: () => void;
  onClose?: () => void;
  isActive?: boolean;
  gitConnection?: {
    chatId: string;
    directory?: string;
    serverUrl: string;
    accessToken: string;
    password?: string;
  };
}) {
  const connection = gitConnection ?? {
    chatId: "",
    serverUrl: "",
    accessToken: "",
  };
  const reviewVcs = useOpencodeReviewProjectVcs({
    ...connection,
    enabled: isActive && !!gitConnection,
  });
  const initializeGit = useInitializeOpencodeGit(connection);
  const workingChanges = useOpencodeWorkingChanges({
    ...connection,
    enabled: isActive && !!gitConnection && mode !== "last-turn",
  });
  const useWorkingChanges = !!gitConnection && mode !== "last-turn";
  const displayedError = useWorkingChanges ? workingChanges.error?.message : changesError;
  const refreshing = isRefreshing || (useWorkingChanges && workingChanges.isFetching);
  const noGit = !!gitConnection && reviewVcs.isSuccess && reviewVcs.data === null;
  const checkingVcs = !!gitConnection?.directory && reviewVcs.isLoading;
  const [filter, setFilter] = useState("");
  const [selectedPath, setSelectedPath] = useState<string>();
  const [expandedContext, setExpandedContext] = useState(false);
  const [diffStyle, setDiffStyle] = useState<DiffStyle>(() => {
    if (typeof window === "undefined") return "unified";
    try {
      return window.localStorage.getItem(DIFF_STYLE_KEY) === "split"
        ? "split"
        : "unified";
    } catch {
      return "unified";
    }
  });
  const normalizedChanges = useMemo(
    () =>
      (useWorkingChanges ? workingChanges.data ?? [] : changes).map((change) => ({
        ...change,
        normalizedPath: normalizeOpencodeFilePath(change.file),
      })),
    [useWorkingChanges, workingChanges.data, changes],
  );
  const filteredChanges = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query
      ? normalizedChanges.filter((change) =>
          change.normalizedPath.toLowerCase().includes(query),
        )
      : normalizedChanges;
  }, [filter, normalizedChanges]);
  const selected =
    filteredChanges.find((change) => change.normalizedPath === selectedPath) ??
    filteredChanges[0];
  const additions = normalizedChanges.reduce(
    (total, change) => total + change.additions,
    0,
  );
  const deletions = normalizedChanges.reduce(
    (total, change) => total + change.deletions,
    0,
  );
  const selectedIndex = selected
    ? filteredChanges.findIndex(
        (change) => change.normalizedPath === selected.normalizedPath,
      )
    : -1;

  const selectAt = (index: number) => {
    const next = filteredChanges[index];
    if (next) setSelectedPath(next.normalizedPath);
  };

  const updateDiffStyle = (style: DiffStyle) => {
    setDiffStyle(style);
    try {
      window.localStorage.setItem(DIFF_STYLE_KEY, style);
    } catch {
      /* Keep the selected style in memory. */
    }
  };

  useEffect(() => {
    if (!selected) {
      setSelectedPath(undefined);
      return;
    }
    if (selected.normalizedPath !== selectedPath) {
      setSelectedPath(selected.normalizedPath);
    }
  }, [selected, selectedPath]);

  return (
    <WorkerPoolContextProvider
      poolOptions={DIFF_POOL_OPTIONS}
      highlighterOptions={DIFF_HIGHLIGHTER_OPTIONS}
    >
      <aside
        id="opencode-review-panel"
        aria-label="Review changes"
        className="bg-background border-border flex h-full min-h-0 w-full flex-col"
      >
        <header className="border-border flex min-h-10 shrink-0 items-center gap-2 border-b px-2">
          <GitCompareArrows className="size-4 shrink-0" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">Git changes</h2>
            <p className="text-muted-foreground text-xs tabular-nums">
              {normalizedChanges.length}{" "}
              {normalizedChanges.length === 1 ? "file" : "files"}
              {normalizedChanges.length > 0 ? (
                <>
                  {" · "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{additions}
                  </span>{" "}
                  <span className="text-red-600 dark:text-red-400">
                    -{deletions}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {onModeChange ? (
              <select
                aria-label="Changes to review"
                className="bg-background max-w-36 min-w-0 rounded-md border px-2 py-1 text-xs"
                value={mode ?? "working"}
                onChange={(event) =>
                  onModeChange(
                    event.target.value === "last-turn"
                      ? "last-turn"
                      : "working",
                  )
                }
              >
                <option value="working">Working changes</option>
                <option value="last-turn">Last turn changes</option>
              </select>
            ) : null}
            <div className="border-border mr-1 hidden items-center rounded-md border sm:flex">
              <Button
                type="button"
                variant={diffStyle === "unified" ? "secondary" : "ghost"}
                size="icon-sm"
                className="rounded-r-none"
                aria-label="Unified diff"
                title="Unified diff"
                onClick={() => updateDiffStyle("unified")}
              >
                <Rows3 />
              </Button>
              <Button
                type="button"
                variant={diffStyle === "split" ? "secondary" : "ghost"}
                size="icon-sm"
                className="rounded-l-none"
                aria-label="Split diff"
                title="Split diff"
                onClick={() => updateDiffStyle("split")}
              >
                <Columns2 />
              </Button>
            </div>
            {onRefresh ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Refresh changes"
                title="Refresh changes"
                disabled={refreshing}
                onClick={() => {
                  if (gitConnection?.directory) void reviewVcs.refetch();
                  onRefresh();
                  if (useWorkingChanges) void workingChanges.refetch();
                }}
              >
                <RefreshCw className={cn(refreshing && "animate-spin")} />
              </Button>
            ) : null}
            {onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close Git changes"
                title="Close Git changes"
              >
                <X />
              </Button>
            ) : (
              <Button asChild type="button" variant="ghost" size="icon-sm">
                <Link
                  href={chatUrl}
                  aria-label="Close review"
                  title="Back to chat"
                >
                  <X />
                </Link>
              </Button>
            )}
          </div>
        </header>

        {gitConnection ? (
          <div className="border-border shrink-0 border-b px-2 py-1.5 text-xs">
            <span className="text-muted-foreground">
              {mode === "last-turn" ? "Session directory" : "Git request directory"}
              {": "}
            </span>
            <code className="select-all break-all font-mono">
              {gitConnection.directory || "Waiting for working directory…"}
            </code>
          </div>
        ) : null}

        {reviewVcs.error && gitConnection ? (
          <div role="alert" className="text-destructive p-6 text-sm">
            {reviewVcs.error.message}
          </div>
        ) : checkingVcs ? (
          <div role="status" className="text-muted-foreground p-6 text-sm">
            Loading repository…
          </div>
        ) : noGit ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <GitCompareArrows className="size-8 opacity-40" />
            <p>This workspace does not have a Git repository.</p>
            <Button
              variant="secondary"
              size="sm"
              disabled={initializeGit.isPending || !gitConnection?.directory}
              onClick={() => {
                if (gitConnection?.directory)
                  initializeGit.mutate(gitConnection.directory);
              }}
            >
              {initializeGit.isPending ? "Initializing…" : "Initialize Git"}
            </Button>
            {initializeGit.error &&
            initializeGit.variables === gitConnection?.directory ? (
              <p role="alert" className="text-destructive">
                {initializeGit.error.message}
              </p>
            ) : null}
          </div>
        ) : displayedError ? (
          <div role="alert" className="text-destructive p-6 text-sm">
            {displayedError}
          </div>
        ) : refreshing && normalizedChanges.length === 0 ? (
          <div role="status" className="text-muted-foreground p-6 text-sm">
            Loading changes…
          </div>
        ) : normalizedChanges.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm">
            <GitCompareArrows className="size-8 opacity-40" />
            <div>
              <p className="text-foreground font-medium">No file changes</p>
              <p>No file changes have been reported for this session yet.</p>
            </div>
          </div>
        ) : (
          <ResizablePanelGroup
            orientation="horizontal"
            className="min-h-0 flex-1"
          >
            <ResizablePanel
              id="changed-files"
              defaultSize="32%"
              minSize="96px"
              maxSize="65%"
            >
              <div className="flex h-full min-h-0 flex-col">
                <label className="border-border relative border-b p-2">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-5 size-3.5 -translate-y-1/2" />
                  <input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Filter files"
                    aria-label="Filter changed files"
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-8 w-full rounded-md border py-1 pr-2 pl-8 text-sm outline-none focus-visible:ring-2"
                  />
                </label>
                <div className="min-h-0 flex-1 overflow-y-auto p-1">
                  {filteredChanges.length > 0 ? (
                    filteredChanges.map((change) => (
                      <button
                        key={change.normalizedPath}
                        type="button"
                        aria-pressed={
                          selected?.normalizedPath === change.normalizedPath
                        }
                        title={change.normalizedPath}
                        className={cn(
                          "hover:bg-muted flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-xs",
                          selected?.normalizedPath === change.normalizedPath &&
                            "bg-muted",
                        )}
                        onClick={() => {
                          setSelectedPath(change.normalizedPath);
                        }}
                      >
                        <FileCode2 className="text-muted-foreground size-3.5 shrink-0" />
                        <span
                          title={change.status ?? "modified"}
                          className={cn(
                            "shrink-0 font-mono",
                            change.status === "added"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : change.status === "deleted"
                                ? "text-red-600 dark:text-red-400"
                                : "text-muted-foreground",
                          )}
                        >
                          {change.status === "added"
                            ? "A"
                            : change.status === "deleted"
                              ? "D"
                              : "M"}
                        </span>
                        <span
                          dir="rtl"
                          className="min-w-0 flex-1 truncate text-left"
                          style={{ unicodeBidi: "plaintext" }}
                        >
                          {change.normalizedPath}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{change.additions}
                          </span>{" "}
                          <span className="text-red-600 dark:text-red-400">
                            -{change.deletions}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-muted-foreground p-4 text-center text-xs">
                      No matching files.
                    </p>
                  )}
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle
              withHandle
              aria-label="Resize changed files and diff preview"
            />
            <ResizablePanel id="git-diff" defaultSize="68%" minSize="100px">
              <div className="flex h-full min-h-0 min-w-0 flex-col">
                {selected ? (
                  <ReviewDiffPreview
                    diff={selected}
                    isActive={isActive}
                    diffStyle={diffStyle}
                    expandedContext={expandedContext}
                    onExpandedContextChange={setExpandedContext}
                    canSelectPrevious={selectedIndex > 0}
                    canSelectNext={
                      selectedIndex >= 0 &&
                      selectedIndex < filteredChanges.length - 1
                    }
                    onSelectPrevious={() => selectAt(selectedIndex - 1)}
                    onSelectNext={() => selectAt(selectedIndex + 1)}
                  />
                ) : null}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </aside>
    </WorkerPoolContextProvider>
  );
});

function ReviewDiffPreview({
  diff,
  isActive,
  diffStyle,
  expandedContext,
  onExpandedContextChange,
  canSelectPrevious,
  canSelectNext,
  onSelectPrevious,
  onSelectNext,
}: {
  diff: SnapshotFileDiff;
  isActive: boolean;
  diffStyle: DiffStyle;
  expandedContext: boolean;
  onExpandedContextChange: (expanded: boolean) => void;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
  onSelectPrevious: () => void;
  onSelectNext: () => void;
}) {
  const path = normalizeOpencodeFilePath(diff.file);

  return (
    <>
      <div className="border-border flex min-w-0 shrink-0 items-center gap-2 border-b px-3 py-2 text-xs">
        <FileCode2 className="size-3.5 shrink-0 text-violet-500" />
        <span
          dir="rtl"
          className="min-w-0 flex-1 truncate text-left"
          style={{ unicodeBidi: "plaintext" }}
          title={path}
        >
          {path}
        </span>
        <span className="shrink-0 font-mono tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400">
            +{diff.additions}
          </span>{" "}
          <span className="text-red-600 dark:text-red-400">
            -{diff.deletions}
          </span>
        </span>
        <div className="border-border ml-1 flex shrink-0 items-center border-l pl-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous changed file"
            title="Previous changed file"
            disabled={!canSelectPrevious}
            onClick={onSelectPrevious}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next changed file"
            title="Next changed file"
            disabled={!canSelectNext}
            onClick={onSelectNext}
          >
            <ChevronRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              expandedContext
                ? "Collapse unchanged lines"
                : "Expand unchanged lines"
            }
            title={
              expandedContext
                ? "Collapse unchanged lines"
                : "Expand unchanged lines"
            }
            onClick={() => onExpandedContextChange(!expandedContext)}
          >
            <ChevronsUpDown />
          </Button>
        </div>
      </div>
      <OpencodeReviewDiff
        patch={diff.patch ?? ""}
        path={path}
        diffStyle={diffStyle}
        expandedContext={expandedContext}
        isActive={isActive}
      />
    </>
  );
}

const DIFF_POOL_OPTIONS = {
  poolSize: 1,
  totalASTLRUCacheSize: 24,
  workerFactory: () =>
    new Worker(new URL("./opencode-diff.worker.ts", import.meta.url), {
      type: "module",
    }),
};
const DIFF_HIGHLIGHTER_OPTIONS = {
  theme: { light: "github-light" as const, dark: "github-dark" as const },
  lineDiffType: "word" as const,
};
