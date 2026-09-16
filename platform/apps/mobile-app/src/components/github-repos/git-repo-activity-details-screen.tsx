import type { GitRepoIssue, GitRepoPullRequest } from "@repo/api-client";
import {
  useGenerateFixForIssue,
  useGenerateReviewForPullRequest,
  useGitRepoActivityDetails,
  useGitRepoById,
} from "@repo/api-hooks";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { GithubAutomationDrawer } from "@/components/github-repos/github-automation-drawer";
import { NativeMarkdown } from "@/components/native-markdown";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function GitRepoActivityDetailsScreen({
  repoId,
  type,
  number,
}: {
  repoId: string;
  type: "pr" | "issue";
  number: number;
}) {
  const router = useRouter();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const repoQuery = useGitRepoById(repoId);
  const detailsQuery = useGitRepoActivityDetails(repoId, type, number);
  const reviewMutation = useGenerateReviewForPullRequest(repoId, number);
  const fixMutation = useGenerateFixForIssue(repoId, number);
  const repo = repoQuery.data;
  const item = detailsQuery.data;
  const isIssue = type === "issue";
  const issue = isIssue ? (item as GitRepoIssue | undefined) : undefined;
  const pullRequest = !isIssue
    ? (item as GitRepoPullRequest | undefined)
    : undefined;
  const pending = reviewMutation.isPending || fixMutation.isPending;
  const canAutomate =
    repo?.type === "github" && Boolean(repo.default_project_id);
  const actionLabel = isIssue ? "Fix with AI" : "Review with AI";

  const refresh = () => {
    void Promise.all([repoQuery.refetch(), detailsQuery.refetch()]);
  };

  const runAutomation = async () => {
    if (!canAutomate || pending) return;
    try {
      if (isIssue) await fixMutation.mutateAsync();
      else await reviewMutation.mutateAsync();
      setConfirming(false);
      requestAnimationFrame(() =>
        Toast.show({
          type: "success",
          text1: isIssue ? "AI fix started" : "AI review started",
        }),
      );
    } catch {
      setConfirming(false);
      requestAnimationFrame(() =>
        Toast.show({
          type: "error",
          text1: isIssue ? "Could not start issue fix" : "Could not start review",
        }),
      );
    }
  };

  const content =
    repoQuery.isPending || detailsQuery.isPending ? (
      <View style={styles.state}>
        <ActivityIndicator color={theme.textSecondary} />
        <ThemedText themeColor="textSecondary">Loading details…</ThemedText>
      </View>
    ) : repoQuery.isError || detailsQuery.isError || !repo || !item ? (
      <View style={styles.state}>
        <SymbolView
          name={{ ios: "exclamationmark.circle", android: "error_outline" }}
          size={28}
          tintColor={theme.textSecondary}
        />
        <ThemedText style={styles.stateTitle}>Could not load details</ThemedText>
        <Pressable onPress={refresh} style={styles.retry}>
          <ThemedText style={styles.retryText}>Try again</ThemedText>
        </Pressable>
      </View>
    ) : (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={repoQuery.isRefetching || detailsQuery.isRefetching}
            onRefresh={refresh}
            tintColor={theme.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.repoName} themeColor="textSecondary">
          {repo.full_name}
        </ThemedText>
        <ThemedText style={styles.title}>
          {item.title}{" "}
          <ThemedText style={styles.number} themeColor="textSecondary">
            #{item.number}
          </ThemedText>
        </ThemedText>

        <View style={styles.metadata}>
          <View
            style={[
              styles.status,
              {
                backgroundColor:
                  item.state === "open" ? "#10b9811f" : theme.backgroundElement,
              },
            ]}
          >
            <SymbolView
              name={
                isIssue
                  ? { ios: "smallcircle.filled.circle", android: "adjust" }
                  : { ios: "arrow.triangle.pull", android: "call_merge" }
              }
              size={14}
              tintColor={item.state === "open" ? "#10b981" : theme.textSecondary}
            />
            <ThemedText style={styles.statusText}>
              {pullRequest?.merged_at
                ? "Merged"
                : item.state === "open"
                  ? "Open"
                  : "Closed"}
            </ThemedText>
          </View>
          {item.user ? (
            <>
              <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
                <Image source={item.user.avatar_url} style={StyleSheet.absoluteFill} />
              </View>
              <ThemedText style={styles.author}>{item.user.login}</ThemedText>
            </>
          ) : null}
        </View>

        {pullRequest?.head.ref && pullRequest.base.ref ? (
          <View style={[styles.branch, { borderColor: theme.backgroundSelected }]}>
            <SymbolView
              name={{ ios: "arrow.triangle.branch", android: "account_tree" }}
              size={15}
              tintColor={theme.textSecondary}
            />
            <ThemedText style={styles.branchText}>
              {pullRequest.head.ref} → {pullRequest.base.ref}
            </ThemedText>
          </View>
        ) : null}

        {issue?.labels.length ? (
          <View style={styles.labels}>
            {issue.labels.map((label, index) => (
              <View
                key={`${label.id ?? label.name ?? "label"}-${index}`}
                style={[styles.label, { borderColor: theme.backgroundSelected }]}
              >
                <ThemedText style={styles.labelText}>{label.name ?? "Label"}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAutomate }}
            disabled={!canAutomate}
            onPress={() => setConfirming(true)}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: theme.text },
              !canAutomate && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={
                !repo.default_project_id
                  ? { ios: "exclamationmark.triangle", android: "warning" }
                  : isIssue
                    ? { ios: "wand.and.stars", android: "auto_fix_high" }
                    : { ios: "sparkles", android: "auto_awesome" }
              }
              size={17}
              tintColor={repo.default_project_id ? theme.background : "#d97706"}
            />
            <ThemedText style={[styles.actionText, { color: theme.background }]}>
              {actionLabel}
            </ThemedText>
          </Pressable>
          {!repo.default_project_id ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSettingsOpen(true)}
              style={[styles.action, { borderColor: theme.backgroundSelected, borderWidth: 1 }]}
            >
              <ThemedText style={styles.actionText}>Set up default project</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="link"
            onPress={() => void WebBrowser.openBrowserAsync(item.html_url)}
            style={[styles.action, { borderColor: theme.backgroundSelected, borderWidth: 1 }]}
          >
            <ThemedText style={styles.actionText}>
              Open on {repo.type === "forgejo" ? "Forgejo" : "GitHub"}
            </ThemedText>
          </Pressable>
        </View>

        {repo.type !== "github" ? (
          <ThemedText style={styles.notice} themeColor="textSecondary">
            AI review and fix actions currently support GitHub repositories only.
          </ThemedText>
        ) : null}

        <View style={[styles.description, { borderColor: theme.backgroundSelected }]}>
          {item.body ? (
            <NativeMarkdown content={item.body} />
          ) : (
            <ThemedText themeColor="textSecondary">No description was provided.</ThemedText>
          )}
        </View>
      </ScrollView>
    );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <PageChromeLayout
        top={<PageHeader onBack={() => router.back()} title={isIssue ? "Issue" : "Pull request"} />}
      >
        {({ topInset }) => (
          <View style={[styles.body, { paddingTop: topInset }]}>{content}</View>
        )}
      </PageChromeLayout>
      <GithubAutomationDrawer
        repo={settingsOpen ? (repo ?? null) : null}
        onClose={() => setSettingsOpen(false)}
      />
      <ConfirmationDrawer
        confirmLabel={actionLabel}
        description={`${actionLabel} for #${number}?`}
        destructive={false}
        isConfirming={pending}
        onCancel={() => !pending && setConfirming(false)}
        onConfirm={() => void runAutomation()}
        title={actionLabel}
        visible={confirming}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  repoName: { fontSize: 13 },
  title: { fontSize: 26, fontWeight: "700", lineHeight: 33, marginTop: 6 },
  number: { fontWeight: "400" },
  metadata: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 16 },
  status: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 13, fontWeight: "600" },
  avatar: { borderRadius: 12, height: 24, overflow: "hidden", width: 24 },
  author: { fontSize: 13, fontWeight: "600" },
  branch: { alignItems: "center", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 8, marginTop: 18, padding: 12 },
  branchText: { flex: 1, fontFamily: Fonts.mono, fontSize: 12 },
  labels: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 16 },
  label: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 9, paddingVertical: 4 },
  labelText: { fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20 },
  action: { alignItems: "center", borderRadius: 11, flexDirection: "row", gap: 7, minHeight: 42, paddingHorizontal: 14, justifyContent: "center" },
  actionText: { fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  notice: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  description: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginTop: 20, minHeight: 180, padding: 16 },
  state: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", minHeight: 360 },
  stateTitle: { fontSize: 16, fontWeight: "600" },
  retry: { paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { fontSize: 14, fontWeight: "600" },
});
