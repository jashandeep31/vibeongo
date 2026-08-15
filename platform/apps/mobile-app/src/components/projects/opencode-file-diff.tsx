import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { SnapshotFileDiff } from "@/components/projects/opencode-chat-turns";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

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
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const path = normalizeFilePath(diff.file);
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.at(-1) ?? "Unknown file";
  const directory = parts.slice(0, -1).join("/");
  const rows = collapseContext(parsePatch(diff.patch ?? ""));

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`${open ? "Collapse" : "Expand"} diff for ${path}`}
        accessibilityRole="button"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <ThemedText style={styles.label}>Edit</ThemedText>
        <ThemedText numberOfLines={1} style={styles.fileName}>
          {fileName}
        </ThemedText>
        <ThemedText
          numberOfLines={1}
          style={[styles.directory, { color: theme.textSecondary }]}
        >
          /{directory ? `${directory}/` : ""}
        </ThemedText>
        <ThemedText style={styles.additions}>+{diff.additions}</ThemedText>
        <ThemedText style={styles.deletions}>-{diff.deletions}</ThemedText>
        <SymbolView
          name={{
            ios: open ? "chevron.down" : "chevron.right",
            android: open ? "expand_more" : "chevron_right",
          }}
          size={14}
          tintColor={theme.textSecondary}
        />
      </Pressable>

      {open && rows.length > 0 ? (
        <View
          style={[
            styles.diff,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <View
            style={[
              styles.pathHeader,
              { borderColor: theme.backgroundSelected },
            ]}
          >
            <SymbolView
              name={{ ios: "doc.text", android: "description" }}
              size={14}
              tintColor="#8b5cf6"
            />
            <ThemedText numberOfLines={1} style={styles.pathText}>
              /{path}
            </ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.rows}>
              {rows.map((row, index) => (
                <View
                  key={`${row.kind}-${row.oldLine ?? ""}-${row.newLine ?? ""}-${index}`}
                  style={[
                    styles.row,
                    row.kind === "addition" && styles.additionRow,
                    row.kind === "deletion" && styles.deletionRow,
                    row.kind === "hunk" && styles.hunkRow,
                  ]}
                >
                  <ThemedText
                    style={[styles.lineNumber, { color: theme.textSecondary }]}
                  >
                    {row.oldLine ?? ""}
                  </ThemedText>
                  <ThemedText
                    style={[styles.lineNumber, { color: theme.textSecondary }]}
                  >
                    {row.newLine ?? ""}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.code,
                      row.kind === "addition" && styles.additionText,
                      row.kind === "deletion" && styles.deletionText,
                      row.kind === "hunk" && styles.hunkText,
                      row.kind === "meta" && { color: theme.textSecondary },
                    ]}
                  >
                    {row.kind === "addition"
                      ? `+${row.text}`
                      : row.kind === "deletion"
                        ? `-${row.text}`
                        : row.kind === "context"
                          ? ` ${row.text}`
                          : row.text}
                  </ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function normalizeFilePath(file?: string) {
  return (file || "Unknown file")
    .replaceAll("\\", "/")
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
    } else {
      const leading = index > 0 ? run.slice(0, 3) : [];
      const trailing = end < rows.length ? run.slice(-3) : [];
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

const styles = StyleSheet.create({
  additionRow: { backgroundColor: "rgba(16, 185, 129, 0.12)" },
  additionText: { color: "#059669" },
  additions: { color: "#059669", fontFamily: Fonts.mono, fontSize: 12 },
  code: {
    flexShrink: 0,
    fontFamily: Fonts.mono,
    fontSize: 11,
    minWidth: 360,
    paddingHorizontal: 8,
  },
  container: { gap: 4 },
  deletionRow: { backgroundColor: "rgba(239, 68, 68, 0.12)" },
  deletionText: { color: "#dc2626" },
  deletions: { color: "#dc2626", fontFamily: Fonts.mono, fontSize: 12 },
  diff: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 360,
    overflow: "hidden",
  },
  directory: { flex: 1, fontSize: 12 },
  fileName: { flexShrink: 1, fontSize: 13 },
  header: { alignItems: "center", flexDirection: "row", gap: 7, minHeight: 38 },
  hunkRow: { backgroundColor: "rgba(59, 130, 246, 0.08)" },
  hunkText: { color: "#3b82f6" },
  label: { fontSize: 13, fontWeight: "700" },
  lineNumber: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    textAlign: "right",
    width: 34,
  },
  pathHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pathText: { flex: 1, fontFamily: Fonts.mono, fontSize: 11 },
  pressed: { opacity: 0.7 },
  row: { alignItems: "center", flexDirection: "row", minHeight: 21 },
  rows: { minWidth: "100%", paddingVertical: 4 },
});
