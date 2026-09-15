export type OpencodeDiffRow = {
  kind: "context" | "addition" | "deletion" | "hunk" | "meta";
  text: string;
  oldLine?: number;
  newLine?: number;
};

export function normalizeOpencodeFilePath(file?: string) {
  return (file || "Unknown file")
    .replaceAll("\\", "/")
    .replace(/^\/home\/ubuntu\/code\/[^/]+\//, "")
    .replace(/^\.\//, "")
    .replace(/^\//, "");
}

export function parseOpencodePatch(patch: string): OpencodeDiffRow[] {
  const rows: OpencodeDiffRow[] = [];
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
    } else if (!insideHunk) {
      continue;
    } else if (line.startsWith("+")) {
      rows.push({ kind: "addition", text: line.slice(1), newLine });
      newLine += 1;
    } else if (line.startsWith("-")) {
      rows.push({ kind: "deletion", text: line.slice(1), oldLine });
      oldLine += 1;
    } else if (line.startsWith(" ")) {
      rows.push({ kind: "context", text: line.slice(1), oldLine, newLine });
      oldLine += 1;
      newLine += 1;
    } else if (line.startsWith("\\")) {
      rows.push({ kind: "meta", text: line });
    }
  }

  return rows;
}

export function collapseOpencodeDiffContext(
  rows: OpencodeDiffRow[],
  contextLines = 3,
) {
  const collapsed: OpencodeDiffRow[] = [];
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
    if (run.length <= contextLines * 2 + 2) {
      collapsed.push(...run);
    } else {
      const leading = index > 0 ? run.slice(0, contextLines) : [];
      const trailing = end < rows.length ? run.slice(-contextLines) : [];
      const hiddenCount = run.length - leading.length - trailing.length;
      collapsed.push(...leading);
      if (hiddenCount > 0) {
        collapsed.push({
          kind: "meta",
          text: `… ${hiddenCount} unchanged ${hiddenCount === 1 ? "line" : "lines"}`,
        });
      }
      collapsed.push(...trailing);
    }
    index = end;
  }
  return collapsed;
}
