"use client";

import type { SnapshotFileDiff } from "@opencode-ai/sdk/v2/client";
import { cn } from "@repo/ui/lib/utils";
import { ChevronRight, FileCode2 } from "lucide-react";

type DiffRow = {
  kind: "context" | "addition" | "deletion" | "hunk" | "meta";
  text: string;
  oldLine?: number;
  newLine?: number;
};

export function OpencodeFileDiff({
  diff,
  defaultOpen = false,
}: {
  diff: SnapshotFileDiff;
  defaultOpen?: boolean;
}) {
  const path = normalizeFilePath(diff.file);
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.at(-1) ?? "Unknown file";
  const directory = parts.slice(0, -1).join("/");
  const rows = collapseContext(parsePatch(diff.patch ?? ""));

  return (
    <details open={defaultOpen} className="group/edit min-w-0 text-sm">
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 py-2 [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 font-medium">Edit</span>
        <span className="min-w-0 truncate" title={path}>
          {fileName}
        </span>
        <span className="text-muted-foreground min-w-0 truncate">
          /{directory ? `${directory}/` : ""}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-xs">
          <span className="text-emerald-600 dark:text-emerald-400">
            +{diff.additions}
          </span>
          <span className="text-red-600 dark:text-red-400">
            -{diff.deletions}
          </span>
          <ChevronRight className="text-muted-foreground size-3.5 transition-transform group-open/edit:rotate-90" />
        </span>
      </summary>

      {rows.length > 0 ? (
        <div className="border-border mb-2 overflow-hidden rounded-lg border">
          <div className="bg-muted/35 border-border flex min-w-0 items-center gap-2 border-b px-3 py-2">
            <FileCode2 className="size-3.5 shrink-0 text-violet-500" />
            <span className="min-w-0 truncate text-xs" title={path}>
              /{path}
            </span>
            <span className="ml-auto flex shrink-0 gap-2 font-mono text-xs">
              <span className="text-emerald-600 dark:text-emerald-400">
                +{diff.additions}
              </span>
              <span className="text-red-600 dark:text-red-400">
                -{diff.deletions}
              </span>
            </span>
          </div>

          <div className="max-h-96 overflow-auto font-mono text-xs leading-5">
            <div className="w-max min-w-full">
              {rows.map((row, index) => (
                <div
                  key={`${row.kind}-${row.oldLine ?? ""}-${row.newLine ?? ""}-${index}`}
                  className={cn(
                    "grid min-h-5 grid-cols-[2.75rem_2.75rem_minmax(max-content,1fr)]",
                    row.kind === "addition" &&
                      "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
                    row.kind === "deletion" &&
                      "bg-red-500/10 text-red-950 dark:text-red-100",
                    row.kind === "hunk" &&
                      "bg-blue-500/8 text-blue-700 dark:text-blue-300",
                    row.kind === "meta" &&
                      "text-muted-foreground bg-muted/20 italic",
                  )}
                >
                  <span className="border-border/60 text-muted-foreground border-r px-2 text-right tabular-nums select-none">
                    {row.oldLine}
                  </span>
                  <span className="border-border/60 text-muted-foreground border-r px-2 text-right tabular-nums select-none">
                    {row.newLine}
                  </span>
                  <span className="px-2 whitespace-pre">
                    {row.kind === "addition"
                      ? `+${row.text}`
                      : row.kind === "deletion"
                        ? `-${row.text}`
                        : row.kind === "context"
                          ? ` ${row.text}`
                          : row.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </details>
  );
}

function normalizeFilePath(file?: string) {
  const normalized = (file || "Unknown file").replaceAll("\\", "/");
  return normalized
    .replace(/^\/home\/ubuntu\/code\/[^/]+\//, "")
    .replace(/^\.\//, "")
    .replace(/^\//, "");
}

function parsePatch(patch: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldLine = 0;
  let newLine = 0;
  let insideHunk = false;

  for (const line of patch.split("\n")) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(line);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      insideHunk = true;
      rows.push({ kind: "hunk", text: line });
      continue;
    }

    if (!insideHunk) continue;

    if (line.startsWith("+")) {
      rows.push({ kind: "addition", text: line.slice(1), newLine });
      newLine += 1;
    } else if (line.startsWith("-")) {
      rows.push({ kind: "deletion", text: line.slice(1), oldLine });
      oldLine += 1;
    } else if (line.startsWith(" ")) {
      rows.push({
        kind: "context",
        text: line.slice(1),
        oldLine,
        newLine,
      });
      oldLine += 1;
      newLine += 1;
    } else if (line.startsWith("\\")) {
      rows.push({ kind: "meta", text: line });
    }
  }

  return rows;
}

function collapseContext(rows: DiffRow[]) {
  const collapsed: DiffRow[] = [];

  for (let index = 0; index < rows.length; ) {
    const row = rows[index];
    if (!row || row.kind !== "context") {
      if (row) collapsed.push(row);
      index += 1;
      continue;
    }

    let end = index;
    while (rows[end]?.kind === "context") end += 1;
    const run = rows.slice(index, end);

    if (run.length <= 8) {
      collapsed.push(...run);
      index = end;
      continue;
    }

    const hasChangeBefore = rows
      .slice(0, index)
      .reverse()
      .some((item) =>
        item.kind === "hunk"
          ? false
          : item.kind === "addition" || item.kind === "deletion",
      );
    const nextBoundary = rows
      .slice(end)
      .findIndex((item) =>
        ["hunk", "addition", "deletion"].includes(item.kind),
      );
    const nextItem = nextBoundary === -1 ? undefined : rows[end + nextBoundary];
    const hasChangeAfter =
      nextItem?.kind === "addition" || nextItem?.kind === "deletion";

    const leading = hasChangeBefore ? run.slice(0, 3) : [];
    const trailing = hasChangeAfter ? run.slice(-3) : [];
    const hiddenCount = run.length - leading.length - trailing.length;

    collapsed.push(...leading);
    if (hiddenCount > 0) {
      collapsed.push({
        kind: "meta",
        text: `… ${hiddenCount} unchanged ${hiddenCount === 1 ? "line" : "lines"}`,
      });
    }
    collapsed.push(...trailing);
    index = end;
  }

  return collapsed;
}
