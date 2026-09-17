import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { SnapshotFileDiff } from "@/components/projects/opencode-chat-turns";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  collapseOpencodeDiffContext,
  normalizeOpencodeFilePath,
  parseOpencodePatch,
} from "@/lib/opencode-diff";

export function OpencodeFileDiff({
  diff,
  defaultOpen = false,
  operationLabel = "Edit",
}: {
  diff: SnapshotFileDiff;
  defaultOpen?: boolean;
  operationLabel?: string | null;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const path = normalizeOpencodeFilePath(diff.file);
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.at(-1) ?? "Unknown file";
  const directory = parts.slice(0, -1).join("/");
  const rows = collapseOpencodeDiffContext(
    parseOpencodePatch(diff.patch ?? ""),
  );

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`${open ? "Collapse" : "Expand"} diff for ${path}`}
        accessibilityRole="button"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        {operationLabel ? (
          <ThemedText style={styles.label}>{operationLabel}</ThemedText>
        ) : null}
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
