"use client";

import {
  collapseOpencodeDiffContext,
  normalizeOpencodeFilePath,
  parseOpencodePatch,
  type OpencodeDiffRow,
} from "@/components/chat/opencode-file-diff";
import type { SnapshotFileDiff } from "@repo/api-client";
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
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type DiffStyle = "unified" | "split";

const DIFF_STYLE_KEY = "vibeongo-opencode-review-diff-style";

export function OpencodeReviewPanel({
  changes,
  isRefreshing,
  chatUrl,
  onRefresh,
}: {
  changes: SnapshotFileDiff[];
  isRefreshing?: boolean;
  chatUrl: string;
  onRefresh?: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [selectedPath, setSelectedPath] = useState<string>();
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [expandedContext, setExpandedContext] = useState(false);
  const [diffStyle, setDiffStyle] = useState<DiffStyle>(() => {
    if (typeof window === "undefined") return "unified";
    return window.localStorage.getItem(DIFF_STYLE_KEY) === "split"
      ? "split"
      : "unified";
  });
  const normalizedChanges = useMemo(
    () =>
      changes.map((change) => ({
        ...change,
        normalizedPath: normalizeOpencodeFilePath(change.file),
      })),
    [changes],
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
    normalizedChanges.find(
      (change) => change.normalizedPath === selectedPath,
    ) ?? filteredChanges[0];
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
    window.localStorage.setItem(DIFF_STYLE_KEY, style);
  };

  useEffect(() => {
    if (!selected) {
      setSelectedPath(undefined);
      setShowMobilePreview(false);
      return;
    }
    if (selected.normalizedPath !== selectedPath) {
      setSelectedPath(selected.normalizedPath);
    }
  }, [selected, selectedPath]);

  return (
    <aside
      id="opencode-review-panel"
      aria-label="Review changes"
      className="bg-background border-border flex h-full min-h-0 w-full flex-col border-t"
    >
      <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-3">
        {showMobilePreview ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Back to changed files"
            onClick={() => setShowMobilePreview(false)}
          >
            <ChevronLeft />
          </Button>
        ) : null}
        <GitCompareArrows className="size-4 shrink-0" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">Review changes</h2>
          <p className="text-muted-foreground text-xs tabular-nums">
            {normalizedChanges.length} {normalizedChanges.length === 1 ? "file" : "files"}
            {normalizedChanges.length > 0 ? (
              <>
                {" · "}<span className="text-emerald-600 dark:text-emerald-400">+{additions}</span>{" "}
                <span className="text-red-600 dark:text-red-400">-{deletions}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
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
              disabled={isRefreshing}
              onClick={onRefresh}
            >
              <RefreshCw className={cn(isRefreshing && "animate-spin")} />
            </Button>
          ) : null}
          <Button asChild type="button" variant="ghost" size="icon-sm">
            <Link href={chatUrl} aria-label="Close review" title="Back to chat">
              <X />
            </Link>
          </Button>
        </div>
      </header>

      {normalizedChanges.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm">
          <GitCompareArrows className="size-8 opacity-40" />
          <div>
            <p className="text-foreground font-medium">No file changes</p>
            <p>No file changes have been reported for this session yet.</p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div
            className={cn(
              "border-border flex min-h-0 w-full flex-col border-r md:w-64 md:shrink-0",
              showMobilePreview && "hidden md:flex",
            )}
          >
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
                    title={change.normalizedPath}
                    className={cn(
                      "hover:bg-muted flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-xs",
                      selected?.normalizedPath === change.normalizedPath &&
                        "bg-muted",
                    )}
                    onClick={() => {
                      setSelectedPath(change.normalizedPath);
                      setShowMobilePreview(true);
                    }}
                  >
                    <FileCode2 className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {change.normalizedPath}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400">+{change.additions}</span>{" "}
                      <span className="text-red-600 dark:text-red-400">-{change.deletions}</span>
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

          <div
            className={cn(
              "hidden min-w-0 flex-1 flex-col md:flex",
              showMobilePreview && "flex",
            )}
          >
            {selected ? (
              <ReviewDiffPreview
                diff={selected}
                diffStyle={diffStyle}
                expandedContext={expandedContext}
                onExpandedContextChange={setExpandedContext}
                canSelectPrevious={selectedIndex > 0}
                canSelectNext={
                  selectedIndex >= 0 && selectedIndex < filteredChanges.length - 1
                }
                onSelectPrevious={() => selectAt(selectedIndex - 1)}
                onSelectNext={() => selectAt(selectedIndex + 1)}
              />
            ) : null}
          </div>
        </div>
      )}
    </aside>
  );
}

function ReviewDiffPreview({
  diff,
  diffStyle,
  expandedContext,
  onExpandedContextChange,
  canSelectPrevious,
  canSelectNext,
  onSelectPrevious,
  onSelectNext,
}: {
  diff: SnapshotFileDiff;
  diffStyle: DiffStyle;
  expandedContext: boolean;
  onExpandedContextChange: (expanded: boolean) => void;
  canSelectPrevious: boolean;
  canSelectNext: boolean;
  onSelectPrevious: () => void;
  onSelectNext: () => void;
}) {
  const path = normalizeOpencodeFilePath(diff.file);
  const parsedRows = parseOpencodePatch(diff.patch ?? "");
  const rows = expandedContext
    ? parsedRows
    : collapseOpencodeDiffContext(parsedRows);

  return (
    <>
      <div className="border-border flex min-w-0 items-center gap-2 border-b px-3 py-2 text-xs">
        <FileCode2 className="text-violet-500 size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate" title={path}>{path}</span>
        <span className="shrink-0 font-mono tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400">+{diff.additions}</span>{" "}
          <span className="text-red-600 dark:text-red-400">-{diff.deletions}</span>
        </span>
        <div className="border-border ml-1 flex shrink-0 items-center border-l pl-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous changed file" title="Previous changed file" disabled={!canSelectPrevious} onClick={onSelectPrevious}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Next changed file" title="Next changed file" disabled={!canSelectNext} onClick={onSelectNext}>
            <ChevronRight />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={expandedContext ? "Collapse unchanged lines" : "Expand unchanged lines"} title={expandedContext ? "Collapse unchanged lines" : "Expand unchanged lines"} onClick={() => onExpandedContextChange(!expandedContext)}>
            <ChevronsUpDown />
          </Button>
        </div>
      </div>
      {rows.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-auto font-mono text-xs leading-5">
          <div
            className={cn(
              "py-2",
              diffStyle === "unified"
                ? "w-max min-w-full"
                : "w-full min-w-0",
            )}
          >
            {diffStyle === "unified" ? (
              rows.map((row, index) => (
                <ReviewDiffRow key={`${row.kind}-${row.oldLine ?? ""}-${row.newLine ?? ""}-${index}`} row={row} />
              ))
            ) : (
              <SplitDiff rows={rows} />
            )}
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-center text-sm">
          This file has no textual patch to display.
        </div>
      )}
    </>
  );
}

function SplitDiff({ rows }: { rows: OpencodeDiffRow[] }) {
  const pairs = pairSplitDiffRows(rows);

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SplitDiffPane pairs={pairs} side="old" />
      <SplitDiffPane pairs={pairs} side="new" />
    </div>
  );
}

function SplitDiffPane({
  pairs,
  side,
}: {
  pairs: ReturnType<typeof pairSplitDiffRows>;
  side: "old" | "new";
}) {
  return (
    <div
      className={cn(
        "border-border/60 min-w-0 overflow-x-auto",
        side === "old" && "border-r",
      )}
    >
      <div className="w-max min-w-full">
        {pairs.map((pair, index) =>
          pair.full ? (
            <div
              key={`${pair.full.kind}-${index}`}
              className="text-muted-foreground bg-muted/30 min-h-5 px-2 italic"
            >
              {pair.full.text}
            </div>
          ) : (
            <SplitDiffCell
              key={`${pair.old?.oldLine ?? ""}-${pair.new?.newLine ?? ""}-${index}`}
              row={side === "old" ? pair.old : pair.new}
              side={side}
            />
          ),
        )}
      </div>
    </div>
  );
}

function pairSplitDiffRows(rows: OpencodeDiffRow[]) {
  const pairs: Array<{
    old?: OpencodeDiffRow;
    new?: OpencodeDiffRow;
    full?: OpencodeDiffRow;
  }> = [];

  for (let index = 0; index < rows.length; ) {
    const row = rows[index]!;
    if (row.kind === "hunk" || row.kind === "meta") {
      pairs.push({ full: row });
      index += 1;
      continue;
    }
    if (row.kind === "context") {
      pairs.push({ old: row, new: row });
      index += 1;
      continue;
    }

    const deleted: OpencodeDiffRow[] = [];
    const added: OpencodeDiffRow[] = [];
    while (
      rows[index]?.kind === "deletion" ||
      rows[index]?.kind === "addition"
    ) {
      const changed = rows[index]!;
      if (changed.kind === "deletion") deleted.push(changed);
      else added.push(changed);
      index += 1;
    }
    const length = Math.max(deleted.length, added.length);
    for (let offset = 0; offset < length; offset += 1) {
      pairs.push({ old: deleted[offset], new: added[offset] });
    }
  }

  return pairs;
}

function SplitDiffCell({ row, side }: { row?: OpencodeDiffRow; side: "old" | "new" }) {
  return (
    <div
      className={cn(
        "grid min-h-5 grid-cols-[2.75rem_minmax(max-content,1fr)]",
        row?.kind === "addition" && "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
        row?.kind === "deletion" && "bg-red-500/10 text-red-950 dark:text-red-100",
      )}
    >
      <span className="border-border/60 text-muted-foreground border-r px-2 text-right tabular-nums select-none">
        {side === "old" ? row?.oldLine : row?.newLine}
      </span>
      <span className="px-2 whitespace-pre">
        {row ? `${row.kind === "addition" ? "+" : row.kind === "deletion" ? "-" : " "}${row.text}` : ""}
      </span>
    </div>
  );
}

function ReviewDiffRow({ row }: { row: OpencodeDiffRow }) {
  return (
    <div
      className={cn(
        "grid min-h-5 grid-cols-[2.75rem_2.75rem_minmax(max-content,1fr)]",
        row.kind === "addition" && "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
        row.kind === "deletion" && "bg-red-500/10 text-red-950 dark:text-red-100",
        row.kind === "hunk" && "bg-blue-500/8 text-blue-700 dark:text-blue-300",
        row.kind === "meta" && "text-muted-foreground bg-muted/20 italic",
      )}
    >
      <span className="border-border/60 text-muted-foreground border-r px-2 text-right tabular-nums select-none">{row.oldLine}</span>
      <span className="border-border/60 text-muted-foreground border-r px-2 text-right tabular-nums select-none">{row.newLine}</span>
      <span className="px-2 whitespace-pre">
        {row.kind === "addition" ? `+${row.text}` : row.kind === "deletion" ? `-${row.text}` : row.kind === "context" ? ` ${row.text}` : row.text}
      </span>
    </div>
  );
}
