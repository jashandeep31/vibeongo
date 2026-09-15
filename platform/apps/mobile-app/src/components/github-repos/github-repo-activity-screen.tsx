import type { GitRepoIssue, GitRepoPullRequest } from "@repo/api-client";
import {
  useDeleteGithubRepo,
  useGenerateFixForIssue,
  useGenerateReviewForPullRequest,
  useGitRepoActivity,
  useGitRepoById,
  useScheduleGithubRepoOverview,
} from "@repo/api-hooks";
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
import { ThemedText } from "@/components/themed-text";
import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { useTheme } from "@/hooks/use-theme";

type ResourceTab = "pull-requests" | "issues";
type ConfirmationTarget =
  | { kind: "delete" }
  | { kind: "overview" }
  | { kind: "review"; number: number }
  | { kind: "fix"; number: number };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return fallback;
}

export function GithubRepoActivityScreen({ repoId }: { repoId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const [activeResource, setActiveResource] =
    useState<ResourceTab>("pull-requests");
  const [showOverview, setShowOverview] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmationTarget, setConfirmationTarget] =
    useState<ConfirmationTarget | null>(null);
  const repoQuery = useGitRepoById(repoId);
  const issuesQuery = useGitRepoActivity(repoId, "issue");
  const pullRequestsQuery = useGitRepoActivity(repoId, "pr");
  const scheduleOverview = useScheduleGithubRepoOverview();
  const deleteRepo = useDeleteGithubRepo();
  const generateReview = useGenerateReviewForPullRequest(
    repoId,
    confirmationTarget?.kind === "review" ? confirmationTarget.number : 0,
  );
  const generateFix = useGenerateFixForIssue(
    repoId,
    confirmationTarget?.kind === "fix" ? confirmationTarget.number : 0,
  );
  const repo = repoQuery.data;
  const isForgejo = repo?.type === "forgejo";
  const providerLabel = isForgejo ? "Forgejo" : "GitHub";
  const overview = repo?.overview.trim() ?? "";
  const issues = issuesQuery.data?.data ?? [];
  const pullRequests = pullRequestsQuery.data?.data ?? [];
  const openIssues = issues.filter((issue) => issue.state === "open").length;
  const openPullRequests = pullRequests.filter(
    (pullRequest) => pullRequest.state === "open",
  ).length;
  const isRefreshing =
    repoQuery.isRefetching ||
    issuesQuery.isRefetching ||
    pullRequestsQuery.isRefetching;
  const isConfirming =
    scheduleOverview.isPending ||
    deleteRepo.isPending ||
    generateReview.isPending ||
    generateFix.isPending;

  const refresh = () => {
    void Promise.all([
      repoQuery.refetch(),
      issuesQuery.refetch(),
      pullRequestsQuery.refetch(),
    ]);
  };

  const openExternalUrl = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, { showTitle: true });
    } catch {
      Toast.show({
        type: "error",
        text1: "Could not open repository",
        text2: "Please try again.",
      });
    }
  };

  const createOverview = async () => {
    if (scheduleOverview.isPending) return;
    try {
      await scheduleOverview.mutateAsync(repoId);
      Toast.show({ type: "success", text1: "Overview generation queued" });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not queue overview",
        text2: getErrorMessage(error, "Please try again."),
      });
    }
  };

  const confirmAction = async () => {
    const target = confirmationTarget;
    if (!target || isConfirming) return;
    try {
      if (target.kind === "delete") {
        await deleteRepo.mutateAsync(repoId);
        setConfirmationTarget(null);
        Toast.show({ type: "success", text1: "Repository removed" });
        router.replace("/github-repos");
        return;
      } else if (target.kind === "overview") {
        await scheduleOverview.mutateAsync(repoId);
      } else if (target.kind === "review") {
        await generateReview.mutateAsync();
      } else {
        await generateFix.mutateAsync();
      }
      setConfirmationTarget(null);
      requestAnimationFrame(() => {
        Toast.show({
          type: "success",
          text1:
            target.kind === "overview"
              ? "Overview refresh queued"
              : target.kind === "review"
                ? "AI review started"
                : "AI fix started",
        });
      });
    } catch (error) {
      setConfirmationTarget(null);
      requestAnimationFrame(() => {
        Toast.show({
          type: "error",
          text1:
            target.kind === "overview"
              ? "Could not queue overview"
              : target.kind === "delete"
                ? "Could not remove repository"
                : target.kind === "review"
                  ? "Could not start review"
                  : "Could not start issue fix",
          text2: getErrorMessage(error, "Please try again."),
        });
      });
    }
  };

  const confirmation = getConfirmationCopy(confirmationTarget);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={() => router.back()}
            title="Repository"
            titleOpacity={titleOpacity}
          />
        }
      >
        {({ topInset }) =>
          repoQuery.isError ||
          (issuesQuery.isError && pullRequestsQuery.isError) ? (
            <View style={[styles.screen, { paddingTop: topInset }]}>
              <ResourceState
                actionLabel="Try again"
                label="Repository activity could not be loaded"
                onAction={refresh}
              />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.content, { paddingTop: topInset }]}
              onScroll={onTitleScroll}
              refreshControl={
                <RefreshControl
                  onRefresh={refresh}
                  refreshing={isRefreshing}
                  tintColor={theme.textSecondary}
                />
              }
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              {repo ? (
                <>
                  <View style={styles.identity}>
                    <View
                      style={[styles.repoIcon, { backgroundColor: theme.text }]}
                    >
                      <SymbolView
                        name={
                          isForgejo
                            ? {
                                ios: "arrow.triangle.branch",
                                android: "account_tree",
                              }
                            : {
                                ios: "chevron.left.forwardslash.chevron.right",
                                android: "code",
                              }
                        }
                        size={19}
                        tintColor={theme.background}
                      />
                    </View>
                    <View style={styles.identityCopy}>
                      <ThemedText
                        style={styles.owner}
                        themeColor="textSecondary"
                      >
                        {repo.repo_owner_username}
                      </ThemedText>
                      <ThemedText numberOfLines={1} style={styles.repoName}>
                        {repo.full_name.split("/").filter(Boolean).at(-1) ??
                          repo.full_name}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.visibilityBadge,
                        { borderColor: theme.backgroundSelected },
                      ]}
                    >
                      <SymbolView
                        name={
                          isForgejo
                            ? {
                                ios: "arrow.triangle.branch",
                                android: "account_tree",
                              }
                            : {
                                ios: "chevron.left.forwardslash.chevron.right",
                                android: "code",
                              }
                        }
                        size={12}
                        tintColor={theme.textSecondary}
                      />
                      <ThemedText
                        style={styles.visibilityText}
                        themeColor="textSecondary"
                      >
                        {providerLabel}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.visibilityBadge,
                        { borderColor: theme.backgroundSelected },
                      ]}
                    >
                      <SymbolView
                        name={
                          repo.public
                            ? {
                                ios: "checkmark.shield",
                                android: "verified_user",
                              }
                            : { ios: "lock", android: "lock" }
                        }
                        size={12}
                        tintColor={theme.textSecondary}
                      />
                      <ThemedText
                        style={styles.visibilityText}
                        themeColor="textSecondary"
                      >
                        {repo.public ? "Public" : "Private"}
                      </ThemedText>
                    </View>
                  </View>

                  <ScrollView
                    contentContainerStyle={styles.actions}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {overview ? (
                      <ActionButton
                        icon={{ ios: "doc.text", android: "description" }}
                        label={showOverview ? "Hide overview" : "Show overview"}
                        onPress={() => setShowOverview((current) => !current)}
                      />
                    ) : null}
                    <ActionButton
                      disabled={scheduleOverview.isPending}
                      icon={
                        overview
                          ? { ios: "arrow.clockwise", android: "refresh" }
                          : { ios: "sparkles", android: "auto_awesome" }
                      }
                      label={overview ? "Refresh overview" : "Create overview"}
                      loading={scheduleOverview.isPending}
                      onPress={() => {
                        if (overview) {
                          setConfirmationTarget({ kind: "overview" });
                        } else {
                          void createOverview();
                        }
                      }}
                    />
                    <ActionButton
                      icon={{ ios: "gearshape", android: "settings" }}
                      label="Settings"
                      onPress={() => setSettingsOpen(true)}
                    />
                    <ActionButton
                      disabled={deleteRepo.isPending}
                      icon={{ ios: "trash", android: "delete" }}
                      label="Remove"
                      loading={deleteRepo.isPending}
                      onPress={() => setConfirmationTarget({ kind: "delete" })}
                    />
                    <ActionButton
                      icon={{ ios: "arrow.up.right", android: "open_in_new" }}
                      label={providerLabel}
                      onPress={() => void openExternalUrl(repo.html_url)}
                    />
                  </ScrollView>

                  {showOverview && overview ? (
                    <View
                      style={[
                        styles.overview,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: theme.backgroundSelected,
                        },
                      ]}
                    >
                      <ThemedText style={styles.overviewTitle}>
                        Overview
                      </ThemedText>
                      <ThemedText
                        selectable
                        style={styles.overviewText}
                        themeColor="textSecondary"
                      >
                        {overview}
                      </ThemedText>
                    </View>
                  ) : null}

                  {!isForgejo && !repo.default_project_id ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSettingsOpen(true)}
                      style={styles.warning}
                    >
                      <SymbolView
                        name={{
                          ios: "exclamationmark.triangle",
                          android: "warning",
                        }}
                        size={18}
                        tintColor="#d97706"
                      />
                      <View style={styles.warningCopy}>
                        <ThemedText style={styles.warningTitle}>
                          Default project required
                        </ThemedText>
                        <ThemedText style={styles.warningDescription}>
                          Choose a project before reviewing pull requests or
                          fixing issues.
                        </ThemedText>
                      </View>
                      <SymbolView
                        name={{
                          ios: "chevron.right",
                          android: "chevron_right",
                        }}
                        size={17}
                        tintColor="#d97706"
                      />
                    </Pressable>
                  ) : null}
                  <View
                    accessibilityRole="tablist"
                    style={[
                      styles.tabs,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  >
                    <TabButton
                      active={activeResource === "pull-requests"}
                      label={`Pull requests${pullRequestsQuery.isPending ? "" : ` ${openPullRequests}`}`}
                      onPress={() => setActiveResource("pull-requests")}
                    />
                    <TabButton
                      active={activeResource === "issues"}
                      label={`Issues${issuesQuery.isPending ? "" : ` ${openIssues}`}`}
                      onPress={() => setActiveResource("issues")}
                    />
                  </View>

                  {activeResource === "pull-requests" ? (
                    pullRequestsQuery.isPending ? (
                      <ActivityListSkeleton />
                    ) : pullRequestsQuery.isError ? (
                      <ResourceState
                        actionLabel="Try again"
                        label="Pull requests could not be loaded"
                        onAction={() => void pullRequestsQuery.refetch()}
                      />
                    ) : pullRequests.length === 0 ? (
                      <ResourceState label="No pull requests found" />
                    ) : (
                      <View
                        style={[
                          styles.resources,
                          { borderColor: theme.backgroundSelected },
                        ]}
                      >
                        {pullRequests.map((pullRequest) => (
                          <PullRequestRow
                            canAutomate={
                              !isForgejo && Boolean(repo.default_project_id)
                            }
                            key={pullRequest.id}
                            onView={() =>
                              router.push({
                                pathname:
                                  "/github-repos/[repoId]/[activityType]/[number]",
                                params: {
                                  repoId,
                                  activityType: "pull-requests",
                                  number: pullRequest.number.toString(),
                                },
                              })
                            }
                            onReview={() =>
                              setConfirmationTarget({
                                kind: "review",
                                number: pullRequest.number,
                              })
                            }
                            pullRequest={pullRequest}
                          />
                        ))}
                      </View>
                    )
                  ) : issuesQuery.isPending ? (
                    <ActivityListSkeleton />
                  ) : issuesQuery.isError ? (
                    <ResourceState
                      actionLabel="Try again"
                      label="Issues could not be loaded"
                      onAction={() => void issuesQuery.refetch()}
                    />
                  ) : issues.length === 0 ? (
                    <ResourceState label="No issues found" />
                  ) : (
                    <View
                      style={[
                        styles.resources,
                        { borderColor: theme.backgroundSelected },
                      ]}
                    >
                      {issues.map((issue) => (
                        <IssueRow
                          canAutomate={
                            !isForgejo && Boolean(repo.default_project_id)
                          }
                          issue={issue}
                          key={issue.id}
                          onFix={() =>
                            setConfirmationTarget({
                              kind: "fix",
                              number: issue.number,
                            })
                          }
                          onView={() =>
                            router.push({
                              pathname:
                                "/github-repos/[repoId]/[activityType]/[number]",
                              params: {
                                repoId,
                                activityType: "issues",
                                number: issue.number.toString(),
                              },
                            })
                          }
                        />
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <RepositoryDetailSkeleton />
              )}
            </ScrollView>
          )
        }
      </PageChromeLayout>

      <GithubAutomationDrawer
        onClose={() => setSettingsOpen(false)}
        repo={settingsOpen ? (repo ?? null) : null}
      />
      <ConfirmationDrawer
        confirmLabel={confirmation.confirmLabel}
        description={confirmation.description}
        destructive={confirmationTarget?.kind === "delete"}
        isConfirming={isConfirming}
        onCancel={() => {
          if (!isConfirming) setConfirmationTarget(null);
        }}
        onConfirm={() => void confirmAction()}
        title={confirmation.title}
        visible={Boolean(confirmationTarget)}
      />
    </SafeAreaView>
  );
}

function getConfirmationCopy(target: ConfirmationTarget | null) {
  if (target?.kind === "delete") {
    return {
      confirmLabel: "Remove",
      description:
        "Remove this repository from VibeOngo? The repository itself will not be deleted from its Git provider.",
      title: "Remove repository",
    };
  }
  if (target?.kind === "review") {
    return {
      confirmLabel: "Start review",
      description: `Start an AI review for pull request #${target.number}?`,
      title: "Review pull request",
    };
  }
  if (target?.kind === "fix") {
    return {
      confirmLabel: "Generate fix",
      description: `Start an AI fix for issue #${target.number}?`,
      title: "Generate issue fix",
    };
  }
  return {
    confirmLabel: "Refresh overview",
    description:
      "Generate a new AI overview? The current overview will be replaced when generation finishes.",
    title: "Refresh repository overview",
  };
}

function ActionButton({
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
}: {
  disabled?: boolean;
  icon: React.ComponentProps<typeof SymbolView>["name"];
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { borderColor: theme.backgroundSelected },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <SymbolView name={icon} size={16} tintColor={theme.text} />
      )}
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
    </Pressable>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && { backgroundColor: theme.text }]}
    >
      <ThemedText
        style={[styles.tabText, active && { color: theme.background }]}
        themeColor={active ? "text" : "textSecondary"}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function PullRequestRow({
  canAutomate,
  onReview,
  onView,
  pullRequest,
}: {
  canAutomate: boolean;
  onReview: () => void;
  onView: () => void;
  pullRequest: GitRepoPullRequest;
}) {
  const theme = useTheme();
  const merged = Boolean(pullRequest.merged_at);
  const statusColor = merged
    ? "#7c3aed"
    : pullRequest.state === "open"
      ? "#059669"
      : theme.textSecondary;
  return (
    <View style={[styles.resource, { borderColor: theme.backgroundSelected }]}> 
      <SymbolView
        name={{ ios: "arrow.triangle.pull", android: "call_merge" }}
        size={17}
        tintColor={statusColor}
      />
      <View style={styles.resourceBody}>
        <View style={styles.resourceHeading}>
          <Pressable accessibilityRole="link" onPress={onView} style={styles.resourceTitleLink}>
            <ThemedText numberOfLines={2} style={styles.resourceTitle}>
              {pullRequest.title}
            </ThemedText>
          </Pressable>
          {pullRequest.draft ? <SmallBadge label="Draft" /> : null}
          {canAutomate ? (
            <Pressable accessibilityLabel="Review with AI" accessibilityRole="button" onPress={onReview} hitSlop={8}>
              <SymbolView
                name={{ ios: "sparkles", android: "auto_awesome" }}
                size={17}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
        <ThemedText style={styles.metaText} themeColor="textSecondary">
          #{pullRequest.number} opened {formatDate(pullRequest.created_at)} by {pullRequest.user?.login ?? "unknown"}
        </ThemedText>
      </View>
    </View>
  );
}

function IssueRow({
  canAutomate,
  issue,
  onFix,
  onView,
}: {
  canAutomate: boolean;
  issue: GitRepoIssue;
  onFix: () => void;
  onView: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.resource, { borderColor: theme.backgroundSelected }]}> 
      <SymbolView
        name={{ ios: "smallcircle.filled.circle", android: "adjust" }}
        size={17}
        tintColor={issue.state === "open" ? "#059669" : theme.textSecondary}
      />
      <View style={styles.resourceBody}>
        <View style={styles.resourceHeading}>
          <Pressable accessibilityRole="link" onPress={onView} style={styles.resourceTitleLink}>
            <ThemedText numberOfLines={2} style={styles.resourceTitle}>{issue.title}</ThemedText>
          </Pressable>
            {issue.labels.map((label, index) => (
              <SmallBadge
                key={`${label.id ?? label.name ?? "label"}-${index}`}
                label={label.name ?? "Label"}
              />
            ))}
          {canAutomate ? (
            <Pressable accessibilityLabel="Fix with AI" accessibilityRole="button" onPress={onFix} hitSlop={8}>
              <SymbolView
                name={{ ios: "wand.and.stars", android: "auto_fix_high" }}
                size={17}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
        <ThemedText style={styles.metaText} themeColor="textSecondary">
          #{issue.number} opened {formatDate(issue.created_at)} by {issue.user?.login ?? "unknown"}
          {issue.comments > 0 ? ` · ${issue.comments} comments` : ""}
        </ThemedText>
      </View>
    </View>
  );
}

function SmallBadge({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.smallBadge, { borderColor: theme.backgroundSelected }]}
    >
      <ThemedText numberOfLines={1} style={styles.smallBadgeText}>
        {label}
      </ThemedText>
    </View>
  );
}


function RepositoryDetailSkeleton() {
  const theme = useTheme();
  const fill = { backgroundColor: theme.backgroundElement };
  return (
    <View
      accessibilityLabel="Loading repository"
      accessibilityRole="progressbar"
    >
      <View style={styles.skeletonIdentity}>
        <View style={[styles.skeletonRepoIcon, fill]} />
        <View style={styles.skeletonIdentityCopy}>
          <View style={[styles.skeletonOwner, fill]} />
          <View style={[styles.skeletonName, fill]} />
        </View>
        <View style={[styles.skeletonVisibility, fill]} />
      </View>
      <View style={styles.skeletonActions}>
        <View style={[styles.skeletonAction, fill]} />
        <View style={[styles.skeletonAction, fill]} />
        <View style={[styles.skeletonAction, fill]} />
      </View>
      <View style={[styles.skeletonTabs, fill]} />
      <ActivityListSkeleton />
    </View>
  );
}

function ActivityListSkeleton() {
  const theme = useTheme();
  const fill = { backgroundColor: theme.backgroundElement };
  return (
    <View
      accessibilityLabel="Loading activity"
      style={[styles.resources, { borderColor: theme.backgroundSelected }]}
    >
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          style={[
            styles.skeletonResource,
            { borderColor: theme.backgroundSelected },
          ]}
        >
          <View style={[styles.skeletonStatus, fill]} />
          <View style={styles.skeletonResourceCopy}>
            <View style={[styles.skeletonResourceTitle, fill]} />
            <View style={[styles.skeletonMeta, fill]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ResourceState({
  actionLabel,
  label,
  loading = false,
  onAction,
}: {
  actionLabel?: string;
  label: string;
  loading?: boolean;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.state}>
      {loading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <SymbolView
          name={{ ios: "tray", android: "inbox" }}
          size={27}
          tintColor={theme.textSecondary}
        />
      )}
      <ThemedText style={styles.stateTitle}>{label}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.stateAction,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.stateActionText}>{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 7,
    minHeight: 39,
    paddingHorizontal: 12,
  },
  actionLabel: { fontSize: 12, fontWeight: "700" },
  actions: { gap: 8, paddingVertical: 20 },
  content: { padding: 20, paddingBottom: 44 },
  disabled: { opacity: 0.4 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 16,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  identity: { alignItems: "center", flexDirection: "row", gap: 11 },
  identityCopy: { flex: 1, minWidth: 0 },
  metaText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  overview: {
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  overviewTitle: { fontSize: 14, fontWeight: "700", marginBottom: 7 },
  overviewText: { fontSize: 13, lineHeight: 20 },
  owner: { fontSize: 12, lineHeight: 16 },
  pressed: { opacity: 0.7 },
  repoIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  repoName: { fontSize: 23, fontWeight: "700", letterSpacing: -0.5 },
  resource: {
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  resourceHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  resourceBody: { flex: 1, minWidth: 0 },
  resourceTitleLink: { flex: 1, minWidth: 160 },
  resources: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  screen: { flex: 1 },
  smallBadge: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 150,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  smallBadgeText: { fontSize: 10 },
  skeletonAction: { borderRadius: 11, height: 39, width: 116 },
  skeletonActions: { flexDirection: "row", gap: 8, paddingVertical: 20 },
  skeletonIdentity: { alignItems: "center", flexDirection: "row", gap: 11 },
  skeletonIdentityCopy: { flex: 1, gap: 7 },
  skeletonMeta: { borderRadius: 5, height: 10, width: "62%" },
  skeletonName: { borderRadius: 6, height: 23, width: "72%" },
  skeletonOwner: { borderRadius: 5, height: 11, width: "38%" },
  skeletonRepoIcon: { borderRadius: 12, height: 44, width: 44 },
  skeletonResource: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  skeletonResourceCopy: { flex: 1, gap: 8 },
  skeletonResourceTitle: { borderRadius: 6, height: 17, width: "88%" },
  skeletonStatus: { borderRadius: 9, height: 18, width: 18 },
  skeletonTabs: {
    borderRadius: 20,
    height: 42,
    marginBottom: 18,
    marginTop: 4,
  },
  skeletonVisibility: { borderRadius: 12, height: 25, width: 62 },
  state: {
    alignItems: "center",
    minHeight: 220,
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  stateAction: {
    borderRadius: 9,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stateActionText: { fontSize: 13, fontWeight: "700" },
  stateTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 9,
    textAlign: "center",
  },
  tab: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 9,
  },
  tabs: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginBottom: 18,
    marginTop: 24,
    padding: 3,
  },
  tabText: { fontSize: 12, fontWeight: "600" },
  visibilityBadge: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    minHeight: 25,
    paddingHorizontal: 8,
  },
  visibilityText: { fontSize: 11 },
  warning: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 13,
  },
  warningCopy: { flex: 1 },
  warningDescription: {
    color: "#d97706",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  warningTitle: { color: "#d97706", fontSize: 13, fontWeight: "700" },
});
