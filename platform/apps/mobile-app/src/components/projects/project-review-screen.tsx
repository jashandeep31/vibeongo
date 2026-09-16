import type { SnapshotFileDiff } from "@repo/api-client";
import { useOpencodeSession } from "@repo/api-hooks";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PageChromeLayout } from "@/components/page-chrome";
import { ProjectChatStatus } from "@/components/projects/project-chat-status";
import { ProjectWorkspaceTopBar } from "@/components/projects/project-workspace-top-bar";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import {
  collapseOpencodeDiffContext,
  normalizeOpencodeFilePath,
  parseOpencodePatch,
  type OpencodeDiffRow,
} from "@/lib/opencode-diff";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function ProjectReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const params = useLocalSearchParams<{
    chatId?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const chatId = firstParam(params.chatId);
  const projectId = firstParam(params.projectId);
  const projectSessionId = firstParam(params.projectSessionId);
  const runtime = useProjectRuntime(projectSessionId);
  const sessionQuery = useOpencodeSession({
    accessToken: runtime.accessToken,
    chatId: projectSessionId,
    password: runtime.password,
    serverUrl: runtime.serverUrl,
    sessionId: chatId,
  });
  const [filter, setFilter] = useState("");
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>();
  const data = sessionQuery.data;
  const changes = useMemo(
    () =>
      (data?.changes ?? []).map((change) => ({
        ...change,
        normalizedPath: normalizeOpencodeFilePath(change.file),
      })),
    [data?.changes],
  );
  const filteredChanges = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    return query
      ? changes.filter((change) =>
          change.normalizedPath.toLocaleLowerCase().includes(query),
        )
      : changes;
  }, [changes, filter]);
  const selected =
    filteredChanges.find((change) => change.normalizedPath === selectedPath) ??
    (wide ? filteredChanges[0] : undefined);
  const selectedIndex = selected
    ? filteredChanges.findIndex(
        (change) => change.normalizedPath === selected.normalizedPath,
      )
    : -1;
  const additions = changes.reduce(
    (total, change) => total + change.additions,
    0,
  );
  const deletions = changes.reduce(
    (total, change) => total + change.deletions,
    0,
  );

  const returnToChat = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/chat",
      params: { chatId, projectId, projectSessionId },
    });
  }, [chatId, projectId, projectSessionId, router]);
  const goBack = useCallback(() => {
    if (!wide && selectedPath) setSelectedPath(undefined);
    else returnToChat();
  }, [returnToChat, selectedPath, wide]);
  const refreshManually = useCallback(async () => {
    if (isManuallyRefreshing) return;
    setIsManuallyRefreshing(true);
    try {
      await sessionQuery.resync();
    } finally {
      setIsManuallyRefreshing(false);
    }
  }, [isManuallyRefreshing, sessionQuery.resync]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (wide || !selectedPath) return false;
          setSelectedPath(undefined);
          return true;
        },
      );
      return () => subscription.remove();
    }, [selectedPath, wide]),
  );

  if ((runtime.isPending || sessionQuery.isPending) && !data) {
    return (
      <View
        style={[styles.centerScreen, { backgroundColor: theme.background }]}
      >
        <ThemedText themeColor="textSecondary">Loading changes…</ThemedText>
      </View>
    );
  }
  if (!data || runtime.isError || !runtime.instance) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ProjectChatStatus
          description={
            sessionQuery.error?.message ??
            "This project session is unavailable or its connection expired."
          }
          onBack={returnToChat}
          title="Could not load changes"
        />
      </View>
    );
  }

  const connection = {
    accessToken: runtime.accessToken,
    chatId: projectSessionId,
    directory: data.session.directory,
    password: runtime.password,
    serverUrl: runtime.serverUrl,
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <ProjectWorkspaceTopBar
            active="review"
            changeCount={changes.length}
            connection={connection}
            instanceId={runtime.instance.id}
            isRefreshing={isManuallyRefreshing}
            onBack={goBack}
            onRefresh={() => void refreshManually()}
            opencodePassword={runtime.password}
            opencodeSessionId={chatId}
            projectId={projectId}
            projectSessionId={projectSessionId}
            terminatesAt={runtime.instance.terminates_at}
            title="Review changes"
          />
        }
      >
        {({ topInset }) => (
          <View style={[styles.content, { paddingTop: topInset }]}>
            {changes.length === 0 ? (
              <EmptyChanges
                refreshing={isManuallyRefreshing}
                onRefresh={() => void refreshManually()}
              />
            ) : (
              <>
                <View
                  style={[
                    styles.summary,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
                  <View>
                    <ThemedText style={styles.summaryTitle}>
                      {changes.length} {changes.length === 1 ? "file" : "files"}{" "}
                      changed
                    </ThemedText>
                    <ThemedText
                      style={styles.summarySubtitle}
                      themeColor="textSecondary"
                    >
                      Session workspace changes
                    </ThemedText>
                  </View>
                  <View style={styles.totals}>
                    <ThemedText style={styles.additions}>
                      +{additions}
                    </ThemedText>
                    <ThemedText style={styles.deletions}>
                      -{deletions}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.reviewBody}>
                  {wide || !selected ? (
                    <ChangedFiles
                      changes={filteredChanges}
                      filter={filter}
                      onChangeFilter={setFilter}
                      onRefresh={() => void refreshManually()}
                      onSelect={(path) => setSelectedPath(path)}
                      refreshing={isManuallyRefreshing}
                      selectedPath={selected?.normalizedPath}
                      wide={wide}
                    />
                  ) : null}
                  {selected ? (
                    <DiffPreview
                      key={selected.normalizedPath}
                      canNext={
                        selectedIndex >= 0 &&
                        selectedIndex < filteredChanges.length - 1
                      }
                      canPrevious={selectedIndex > 0}
                      diff={selected}
                      onNext={() =>
                        setSelectedPath(
                          filteredChanges[selectedIndex + 1]?.normalizedPath,
                        )
                      }
                      onPrevious={() =>
                        setSelectedPath(
                          filteredChanges[selectedIndex - 1]?.normalizedPath,
                        )
                      }
                      wide={wide}
                    />
                  ) : null}
                </View>
              </>
            )}
          </View>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

type NormalizedDiff = SnapshotFileDiff & { normalizedPath: string };

function ChangedFiles({
  changes,
  filter,
  onChangeFilter,
  onRefresh,
  onSelect,
  refreshing,
  selectedPath,
  wide,
}: {
  changes: NormalizedDiff[];
  filter: string;
  onChangeFilter: (value: string) => void;
  onRefresh: () => void;
  onSelect: (path: string) => void;
  refreshing: boolean;
  selectedPath?: string;
  wide: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.filePane,
        wide && { borderColor: theme.backgroundSelected },
      ]}
    >
      <View
        style={[styles.search, { backgroundColor: theme.backgroundElement }]}
      >
        <SymbolView
          name={{ ios: "magnifyingglass", android: "search" }}
          size={16}
          tintColor={theme.textSecondary}
        />
        <TextInput
          accessibilityLabel="Filter changed files"
          autoCapitalize="none"
          onChangeText={onChangeFilter}
          placeholder="Filter files"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
          value={filter}
        />
      </View>
      <FlatList
        contentContainerStyle={styles.fileList}
        data={changes}
        keyExtractor={(item) => item.normalizedPath}
        ListEmptyComponent={
          <ThemedText style={styles.noMatches} themeColor="textSecondary">
            No matching files.
          </ThemedText>
        }
        refreshControl={
          <RefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={`Open diff for ${item.normalizedPath}`}
            accessibilityRole="button"
            onPress={() => onSelect(item.normalizedPath)}
            style={({ pressed }) => [
              styles.fileRow,
              selectedPath === item.normalizedPath && {
                backgroundColor: theme.backgroundSelected,
              },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "doc.text", android: "description" }}
              size={16}
              tintColor={theme.textSecondary}
            />
            <View style={styles.fileCopy}>
              <ThemedText numberOfLines={1} style={styles.filePath}>
                {item.normalizedPath}
              </ThemedText>
              <ThemedText style={styles.fileStatus} themeColor="textSecondary">
                {item.status ?? "modified"}
              </ThemedText>
            </View>
            <ThemedText style={styles.additions}>+{item.additions}</ThemedText>
            <ThemedText style={styles.deletions}>-{item.deletions}</ThemedText>
            {!wide ? (
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={16}
                tintColor={theme.textSecondary}
              />
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

function DiffPreview({
  canNext,
  canPrevious,
  diff,
  onNext,
  onPrevious,
  wide,
}: {
  canNext: boolean;
  canPrevious: boolean;
  diff: NormalizedDiff;
  onNext: () => void;
  onPrevious: () => void;
  wide: boolean;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const parsedRows = useMemo(
    () => parseOpencodePatch(diff.patch ?? ""),
    [diff.patch],
  );
  const rows = useMemo(
    () => (expanded ? parsedRows : collapseOpencodeDiffContext(parsedRows)),
    [expanded, parsedRows],
  );
  return (
    <View style={styles.diffPane}>
      <View
        style={[styles.diffHeader, { borderColor: theme.backgroundSelected }]}
      >
        {!wide ? (
          <SymbolView
            name={{ ios: "doc.text", android: "description" }}
            size={16}
            tintColor={theme.textSecondary}
          />
        ) : null}
        <ThemedText numberOfLines={1} style={styles.diffPath}>
          {diff.normalizedPath}
        </ThemedText>
        <Pressable
          accessibilityLabel="Previous changed file"
          accessibilityRole="button"
          disabled={!canPrevious}
          onPress={onPrevious}
          style={[styles.smallAction, !canPrevious && styles.disabled]}
        >
          <SymbolView
            name={{ ios: "chevron.up", android: "keyboard_arrow_up" }}
            size={18}
            tintColor={theme.textSecondary}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Next changed file"
          accessibilityRole="button"
          disabled={!canNext}
          onPress={onNext}
          style={[styles.smallAction, !canNext && styles.disabled]}
        >
          <SymbolView
            name={{ ios: "chevron.down", android: "keyboard_arrow_down" }}
            size={18}
            tintColor={theme.textSecondary}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={
            expanded ? "Collapse unchanged lines" : "Expand unchanged lines"
          }
          accessibilityRole="button"
          onPress={() => setExpanded((value) => !value)}
          style={styles.smallAction}
        >
          <SymbolView
            name={{
              ios: expanded
                ? "arrow.down.right.and.arrow.up.left"
                : "arrow.up.left.and.arrow.down.right",
              android: expanded ? "collapse_all" : "expand_all",
            }}
            size={18}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </View>
      {rows.length ? (
        <ScrollView horizontal style={styles.horizontalDiff}>
          <FlatList
            data={rows}
            initialNumToRender={40}
            key={`${diff.normalizedPath}:${expanded}`}
            keyExtractor={(_, index) => String(index)}
            renderItem={({ item }) => <DiffRow row={item} />}
            windowSize={9}
          />
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <ThemedText themeColor="textSecondary">
            No patch content is available for this file.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function DiffRow({ row }: { row: OpencodeDiffRow }) {
  const theme = useTheme();
  const backgroundColor =
    row.kind === "addition"
      ? "rgba(16,185,129,0.12)"
      : row.kind === "deletion"
        ? "rgba(239,68,68,0.12)"
        : row.kind === "hunk"
          ? "rgba(59,130,246,0.09)"
          : "transparent";
  const color =
    row.kind === "addition"
      ? "#059669"
      : row.kind === "deletion"
        ? "#dc2626"
        : row.kind === "hunk"
          ? "#3b82f6"
          : row.kind === "meta"
            ? theme.textSecondary
            : theme.text;
  const marker =
    row.kind === "addition"
      ? "+"
      : row.kind === "deletion"
        ? "-"
        : row.kind === "context"
          ? " "
          : "";
  return (
    <View style={[styles.diffRow, { backgroundColor }]}>
      <ThemedText style={[styles.lineNumber, { color: theme.textSecondary }]}>
        {row.oldLine ?? ""}
      </ThemedText>
      <ThemedText style={[styles.lineNumber, { color: theme.textSecondary }]}>
        {row.newLine ?? ""}
      </ThemedText>
      <ThemedText style={[styles.code, { color }]}>
        {marker}
        {row.text}
      </ThemedText>
    </View>
  );
}

function EmptyChanges({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <SymbolView
        name={{ ios: "checkmark.circle", android: "check_circle" }}
        size={38}
        tintColor={theme.textSecondary}
      />
      <ThemedText style={styles.emptyTitle}>No file changes</ThemedText>
      <ThemedText style={styles.centerCopy} themeColor="textSecondary">
        No changes have been reported for this chat yet.
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        disabled={refreshing}
        onPress={onRefresh}
        style={[
          styles.refreshButton,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        {refreshing ? (
          <ActivityIndicator size="small" />
        ) : (
          <ThemedText style={styles.refreshText}>Refresh</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  additions: { color: "#059669", fontFamily: Fonts.mono, fontSize: 12 },
  center: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 28,
  },
  centerCopy: { fontSize: 13, textAlign: "center" },
  centerScreen: { alignItems: "center", flex: 1, justifyContent: "center" },
  code: {
    flexShrink: 0,
    fontFamily: Fonts.mono,
    fontSize: 11,
    minWidth: 520,
    paddingHorizontal: 8,
  },
  content: { flex: 1, paddingHorizontal: 14 },
  deletions: { color: "#dc2626", fontFamily: Fonts.mono, fontSize: 12 },
  diffHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  diffPane: { flex: 1, minHeight: 0, minWidth: 0 },
  diffPath: { flex: 1, fontFamily: Fonts.mono, fontSize: 12 },
  diffRow: { alignItems: "center", flexDirection: "row", minHeight: 22 },
  disabled: { opacity: 0.3 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  fileCopy: { flex: 1, gap: 2 },
  fileList: { gap: 4, paddingBottom: 24, paddingTop: 8 },
  filePane: {
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: 0,
    paddingRight: 10,
  },
  filePath: { fontFamily: Fonts.mono, fontSize: 12 },
  fileRow: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  fileStatus: { fontSize: 10, textTransform: "capitalize" },
  horizontalDiff: { flex: 1 },
  lineNumber: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    textAlign: "right",
    width: 34,
  },
  noMatches: { padding: 28, textAlign: "center" },
  pressed: { opacity: 0.65 },
  refreshButton: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 42,
    minWidth: 100,
    paddingHorizontal: 18,
  },
  refreshText: { fontSize: 13, fontWeight: "700" },
  reviewBody: { flex: 1, flexDirection: "row", minHeight: 0 },
  screen: { flex: 1 },
  search: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
    marginTop: 10,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  smallAction: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 36,
  },
  summary: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  summarySubtitle: { fontSize: 11, marginTop: 2 },
  summaryTitle: { fontSize: 14, fontWeight: "700" },
  totals: { flexDirection: "row", gap: 9 },
});
