"use client";

import {
  collapseOpencodeDiffContext,
  parseOpencodePatch,
  type OpencodeDiffRow,
} from "@/components/chat/opencode-file-diff";
import {
  parsePatchFiles,
  type FileDiffMetadata,
  type FileDiffOptions,
} from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { useTheme } from "next-themes";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const MAX_HIGHLIGHT_BYTES = 500_000;
const FALLBACK_PAGE_SIZE = 400;

type Props = {
  patch: string;
  path: string;
  diffStyle: "unified" | "split";
  expandedContext: boolean;
  isActive: boolean;
};

export function OpencodeReviewDiff({
  patch,
  path,
  diffStyle,
  expandedContext,
  isActive,
}: Props) {
  const normalizedPatch = useMemo(() => patch.replace(/\r\n/g, "\n"), [patch]);
  const rows = useMemo(
    () => parseOpencodePatch(normalizedPatch),
    [normalizedPatch],
  );
  const parsed = useMemo(() => {
    if (
      !rows.length ||
      normalizedPatch.length > MAX_HIGHLIGHT_BYTES ||
      rows.length > 4000
    )
      return { fileDiff: undefined, error: false };
    try {
      const hasHeader =
        normalizedPatch.startsWith("diff --git ") ||
        /^--- [^\n]*\n\+\+\+ /m.test(normalizedPatch);
      const input = hasHeader
        ? normalizedPatch
        : `--- ${path}\t\n+++ ${path}\t\n${normalizedPatch}`;
      // A new metadata object for every patch revision prevents stale results
      // for a file whose name and changed-line totals have not changed.
      const fileDiff = parsePatchFiles(input, undefined, true)[0]?.files[0];
      return { fileDiff, error: !fileDiff || fileDiff.hunks.length === 0 };
    } catch {
      return { fileDiff: undefined, error: true };
    }
  }, [normalizedPatch, path, rows.length]);
  const container = useRef<HTMLDivElement>(null);
  const [hasSpace, setHasSpace] = useState(false);

  useEffect(() => {
    const node = container.current;
    if (!node || !isActive) {
      setHasSpace(false);
      return;
    }
    const measure = () =>
      setHasSpace(node.clientWidth > 0 && node.clientHeight > 0);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [isActive]);

  const fallbackRows = useMemo(
    () => (expandedContext ? rows : collapseOpencodeDiffContext(rows)),
    [rows, expandedContext],
  );
  const tooLarge =
    normalizedPatch.length > MAX_HIGHLIGHT_BYTES || rows.length > 4000;

  return (
    <div
      ref={container}
      className="relative min-h-0 min-w-0 flex-1 overflow-auto"
      aria-label={`Changes in ${path}`}
    >
      {rows.length > 0 ? (
        <DiffRevision
          key={`${path}\0${normalizedPatch}`}
          fileDiff={parsed.error || tooLarge ? undefined : parsed.fileDiff}
          rows={fallbackRows}
          diffStyle={diffStyle}
          expandedContext={expandedContext}
          canRender={isActive && hasSpace}
          parseError={parsed.error}
          tooLarge={tooLarge}
        />
      ) : (
        <p className="text-muted-foreground p-6 text-center text-sm">
          {/^(Binary files |GIT binary patch)/m.test(normalizedPatch)
            ? "Binary file changed. No text diff is available."
            : normalizedPatch.trim()
              ? "This change has no text hunks (for example, an empty file, rename, or permission change)."
              : "No patch was supplied for this file. Refresh changes to request it again."}
        </p>
      )}
    </div>
  );
}

function DiffRevision({
  fileDiff,
  rows,
  diffStyle,
  expandedContext,
  canRender,
  parseError,
  tooLarge,
}: {
  fileDiff?: FileDiffMetadata;
  rows: OpencodeDiffRow[];
  diffStyle: Props["diffStyle"];
  expandedContext: boolean;
  canRender: boolean;
  parseError: boolean;
  tooLarge: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [useWorker, setUseWorker] = useState(true);
  const onError = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);
  const onPostRender = useCallback((node: HTMLElement) => {
    const root = node.shadowRoot ?? node;
    // A populated metadata object does not prove that the renderer painted.
    const line = root.querySelector<HTMLElement>("[data-line]");
    const rect = line?.getBoundingClientRect();
    setReady(!!rect && rect.height > 0 && rect.width > 0);
  }, []);
  const options = useMemo<FileDiffOptions<undefined, undefined>>(
    () => ({
      diffStyle,
      theme: { light: "github-light", dark: "github-dark" },
      themeType: resolvedTheme === "dark" ? "dark" : "light",
      disableFileHeader: true,
      disableErrorHandling: true,
      expandUnchanged: expandedContext,
      lineDiffType: "word",
      overflow: "scroll",
      onPostRender,
      unsafeCSS:
        ":host { display: block; font-size: 12px; } pre, [data-code] { font-family: var(--font-mono, monospace); }",
    }),
    [diffStyle, expandedContext, resolvedTheme, onPostRender],
  );

  useEffect(() => {
    if (!canRender) {
      setReady(false);
      return;
    }
    if (ready || !fileDiff || failed || !useWorker) return;
    // A blocked worker must never block the readable diff. Try the renderer's
    // local highlighter once; the plain view remains present throughout.
    const timer = window.setTimeout(() => setUseWorker(false), 3000);
    return () => window.clearTimeout(timer);
  }, [canRender, ready, fileDiff, failed, useWorker]);

  return (
    <>
      {(!ready || !canRender || failed) && (
        <PlainDiff
          rows={rows}
          diffStyle={diffStyle}
          notice={
            parseError
              ? "Showing the available patch; the highlighted view could not parse it."
              : tooLarge
                ? "Large patch: showing a paged diff to keep the sidebar responsive."
                : failed || !useWorker
                  ? "Showing the readable diff while syntax highlighting is unavailable."
                  : undefined
          }
        />
      )}
      {canRender && fileDiff && !failed && (
        <DiffRenderBoundary onError={onError}>
          <div
            aria-hidden={!ready}
            className={cn(
              "min-w-0",
              !ready &&
                "pointer-events-none absolute top-0 left-0 w-full opacity-0",
            )}
          >
            <FileDiff
              key={useWorker ? "worker" : "local"}
              fileDiff={fileDiff}
              options={options}
              disableWorkerPool={!useWorker}
              className="block min-w-0"
            />
          </div>
        </DiffRenderBoundary>
      )}
    </>
  );
}

class DiffRenderBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Pair = {
  old?: OpencodeDiffRow;
  next?: OpencodeDiffRow;
  full?: OpencodeDiffRow;
};
function pairRows(rows: OpencodeDiffRow[]): Pair[] {
  const pairs: Pair[] = [];
  for (let index = 0; index < rows.length;) {
    const row = rows[index]!;
    if (row.kind === "hunk" || row.kind === "meta") {
      pairs.push({ full: row });
      index++;
    } else if (row.kind === "context") {
      pairs.push({ old: row, next: row });
      index++;
    } else {
      const deleted: OpencodeDiffRow[] = [],
        added: OpencodeDiffRow[] = [];
      while (
        rows[index]?.kind === "addition" ||
        rows[index]?.kind === "deletion"
      ) {
        const changed = rows[index++]!;
        (changed.kind === "deletion" ? deleted : added).push(changed);
      }
      for (
        let offset = 0;
        offset < Math.max(deleted.length, added.length);
        offset++
      )
        pairs.push({ old: deleted[offset], next: added[offset] });
    }
  }
  return pairs;
}

function PlainDiff({
  rows,
  diffStyle,
  notice,
}: {
  rows: OpencodeDiffRow[];
  diffStyle: Props["diffStyle"];
  notice?: string;
}) {
  const [page, setPage] = useState(0);
  const pairs = useMemo<Pair[]>(
    () =>
      diffStyle === "split" ? pairRows(rows) : rows.map((full) => ({ full })),
    [rows, diffStyle],
  );
  const pages = Math.max(1, Math.ceil(pairs.length / FALLBACK_PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = pairs.slice(
    current * FALLBACK_PAGE_SIZE,
    (current + 1) * FALLBACK_PAGE_SIZE,
  );
  return (
    <div data-readable-diff className="min-w-0 font-mono text-xs leading-5">
      {notice && (
        <p
          role="status"
          className="text-muted-foreground border-b px-3 py-2 font-sans text-xs"
        >
          {notice}
        </p>
      )}
      {pages > 1 && (
        <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-2 py-1 font-sans">
          <Button
            size="sm"
            variant="ghost"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-xs">
            {current + 1} / {pages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      )}
      <div className="w-max min-w-full">
        {visible.map((pair, index) =>
          pair.full ? (
            <PlainRow key={index} row={pair.full} />
          ) : (
            <div key={index} className="grid grid-cols-2">
              <PlainRow row={pair.old} side="old" />
              <PlainRow row={pair.next} side="new" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function PlainRow({
  row,
  side,
}: {
  row?: OpencodeDiffRow;
  side?: "old" | "new";
}) {
  return (
    <div
      className={cn(
        "grid min-h-5",
        side
          ? "grid-cols-[2.75rem_minmax(max-content,1fr)]"
          : "grid-cols-[2.75rem_2.75rem_minmax(max-content,1fr)]",
        row?.kind === "addition" && "bg-emerald-500/10",
        row?.kind === "deletion" && "bg-red-500/10",
        row?.kind === "hunk" &&
          "bg-blue-500/10 text-blue-700 dark:text-blue-300",
        row?.kind === "meta" && "text-muted-foreground bg-muted/20 italic",
      )}
    >
      <span className="text-muted-foreground border-r px-2 text-right tabular-nums select-none">
        {side === "new" ? row?.newLine : row?.oldLine}
      </span>
      {!side && (
        <span className="text-muted-foreground border-r px-2 text-right tabular-nums select-none">
          {row?.newLine}
        </span>
      )}
      <span className="px-2 whitespace-pre">
        {row?.kind === "addition" ? "+" : row?.kind === "deletion" ? "-" : " "}
        {row?.text ?? ""}
      </span>
    </div>
  );
}
