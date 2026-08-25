import type { GithubRepoIssue, GithubRepoPullRequest } from "@repo/api-client";
import {
  useDeleteGithubRepo,
  useGenerateFixForIssue,
  useGenerateReviewForPullRequest,
  useGithubRepoIssues,
  useGithubRepoPullRequests,
  useScheduleGithubRepoOverview,
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
import { ThemedText } from "@/components/themed-text";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { Fonts } from "@/constants/theme";
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
  const [activeResource, setActiveResource] =
    useState<ResourceTab>("pull-requests");
  const [showOverview, setShowOverview] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmationTarget, setConfirmationTarget] =
    useState<ConfirmationTarget | null>(null);
  const issuesQuery = useGithubRepoIssues(repoId);
  const pullRequestsQuery = useGithubRepoPullRequests(repoId);
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
  const repo = pullRequestsQuery.data ?? issuesQuery.data;
  const isForgejo = repo?.type === "forgejo";
  const providerLabel = isForgejo ? "Forgejo" : "GitHub";
  const overview = repo?.overview.trim() ?? "";
  const issues = issuesQuery.data?.issues ?? [];
  const pullRequests = pullRequestsQuery.data?.pull_requests ?? [];
  const openIssues = issues.filter((issue) => issue.state === "open").length;
  const openPullRequests = pullRequests.filter(
    (pullRequest) => pullRequest.state === "open",
  ).length;
  const isRefreshing =
    issuesQuery.isRefetching || pullRequestsQuery.isRefetching;
  const isConfirming =
    scheduleOverview.isPending ||
    deleteRepo.isPending ||
    generateReview.isPending ||
    generateFix.isPending;

  const refresh = () => {
    void Promise.all([issuesQuery.refetch(), pullRequestsQuery.refetch()]);
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
        top={<PageHeader onBack={() => router.back()} title="Repository" />}
      >
        {({ topInset }) =>
          issuesQuery.isError && pullRequestsQuery.isError ? (
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
              refreshControl={
                <RefreshControl
                  onRefresh={refresh}
                  refreshing={isRefreshing}
                  tintColor={theme.textSecondary}
                />
              }
              showsVerticalScrollIndicator={false}
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
                    {!isForgejo ? (
                      <ActionButton
                        icon={{ ios: "arrow.up.right", android: "open_in_new" }}
                        label="GitHub"
                        onPress={() =>
                          void openExternalUrl(
                            `https://github.com/${repo.full_name}`,
                          )
                        }
                      />
                    ) : null}
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

                  {!repo.default_project_id ? (
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
                      <View style={styles.resources}>
                        {pullRequests.map((pullRequest) => (
                          <PullRequestRow
                            canAutomate={Boolean(repo.default_project_id)}
                            key={pullRequest.id}
                            onOpen={() =>
                              void openExternalUrl(pullRequest.html_url)
                            }
                            onReview={() =>
                              setConfirmationTarget({
                                kind: "review",
                                number: pullRequest.number,
                              })
                            }
                            providerLabel={providerLabel}
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
                    <View style={styles.resources}>
                      {issues.map((issue) => (
                        <IssueRow
                          canAutomate={Boolean(repo.default_project_id)}
                          issue={issue}
                          key={issue.id}
                          onFix={() =>
                            setConfirmationTarget({
                              kind: "fix",
                              number: issue.number,
                            })
                          }
                          onOpen={() => void openExternalUrl(issue.html_url)}
                          providerLabel={providerLabel}
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
  onOpen,
  onReview,
  providerLabel,
  pullRequest,
}: {
  canAutomate: boolean;
  onOpen: () => void;
  onReview: () => void;
  providerLabel: string;
  pullRequest: GithubRepoPullRequest;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.resource, { borderColor: theme.backgroundSelected }]}>
      <ResourceAuthor
        avatarUrl={pullRequest.user?.avatar_url}
        login={pullRequest.user?.login}
      />
      <View style={styles.resourceBody}>
        <View style={styles.resourceBadges}>
          <StatusBadge
            merged={Boolean(pullRequest.merged_at)}
            state={pullRequest.state}
          />
          {pullRequest.draft ? <SmallBadge label="Draft" /> : null}
          <ThemedText style={styles.number} themeColor="textSecondary">
            #{pullRequest.number}
          </ThemedText>
        </View>
        <ThemedText style={styles.resourceTitle}>
          {pullRequest.title}
        </ThemedText>
        <View style={styles.metadata}>
          <ThemedText style={styles.metaText} themeColor="textSecondary">
            {pullRequest.user?.login ?? "Unknown author"}
          </ThemedText>
          <ThemedText style={styles.metaText} themeColor="textSecondary">
            {formatDate(pullRequest.created_at)}
          </ThemedText>
        </View>
        <View style={styles.branch}>
          <SymbolView
            name={{ ios: "arrow.triangle.branch", android: "account_tree" }}
            size={14}
            tintColor={theme.textSecondary}
          />
          <ThemedText
            numberOfLines={1}
            style={styles.branchText}
            themeColor="textSecondary"
          >
            {pullRequest.head.ref} → {pullRequest.base.ref}
          </ThemedText>
        </View>
        <View style={styles.resourceActions}>
          <ResourceButton
            disabled={!canAutomate}
            icon={{ ios: "sparkles", android: "auto_awesome" }}
            label="Review"
            onPress={onReview}
          />
          <ResourceButton
            icon={{ ios: "arrow.up.right", android: "open_in_new" }}
            label={providerLabel}
            onPress={onOpen}
          />
        </View>
      </View>
    </View>
  );
}

function IssueRow({
  canAutomate,
  issue,
  onFix,
  onOpen,
  providerLabel,
}: {
  canAutomate: boolean;
  issue: GithubRepoIssue;
  onFix: () => void;
  onOpen: () => void;
  providerLabel: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.resource, { borderColor: theme.backgroundSelected }]}>
      <ResourceAuthor
        avatarUrl={issue.user?.avatar_url}
        login={issue.user?.login}
      />
      <View style={styles.resourceBody}>
        <View style={styles.resourceBadges}>
          <StatusBadge state={issue.state} />
          <ThemedText style={styles.number} themeColor="textSecondary">
            #{issue.number}
          </ThemedText>
        </View>
        <ThemedText style={styles.resourceTitle}>{issue.title}</ThemedText>
        {issue.labels.length > 0 ? (
          <View style={styles.labels}>
            {issue.labels.map((label, index) => (
              <SmallBadge
                key={`${label.id ?? label.name ?? "label"}-${index}`}
                label={label.name ?? "Label"}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.metadata}>
          <ThemedText style={styles.metaText} themeColor="textSecondary">
            {issue.user?.login ?? "Unknown author"}
          </ThemedText>
          <ThemedText style={styles.metaText} themeColor="textSecondary">
            {formatDate(issue.created_at)}
          </ThemedText>
          <ThemedText style={styles.metaText} themeColor="textSecondary">
            {issue.comments} comments
          </ThemedText>
        </View>
        <View style={styles.resourceActions}>
          <ResourceButton
            disabled={!canAutomate}
            icon={{ ios: "wand.and.stars", android: "auto_fix_high" }}
            label="Generate fix"
            onPress={onFix}
          />
          <ResourceButton
            icon={{ ios: "arrow.up.right", android: "open_in_new" }}
            label={providerLabel}
            onPress={onOpen}
          />
        </View>
      </View>
    </View>
  );
}

function ResourceAuthor({
  avatarUrl,
  login,
}: {
  avatarUrl?: string;
  login?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={styles.avatarFallback} themeColor="textSecondary">
        {login?.slice(0, 2).toUpperCase() ?? "GH"}
      </ThemedText>
      {avatarUrl ? (
        <Image
          source={avatarUrl}
          style={StyleSheet.absoluteFill}
          transition={120}
        />
      ) : null}
    </View>
  );
}

function StatusBadge({
  state,
  merged = false,
}: {
  state: string;
  merged?: boolean;
}) {
  const label = merged ? "Merged" : state === "open" ? "Open" : "Closed";
  const color = merged ? "#7c3aed" : state === "open" ? "#059669" : "#6b7280";
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}1A` }]}>
      <ThemedText style={[styles.statusText, { color }]}>{label}</ThemedText>
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

function ResourceButton({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: React.ComponentProps<typeof SymbolView>["name"];
  label: string;
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
        styles.resourceButton,
        { backgroundColor: theme.backgroundElement },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView name={icon} size={15} tintColor={theme.text} />
      <ThemedText style={styles.resourceButtonText}>{label}</ThemedText>
    </Pressable>
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
    <View accessibilityLabel="Loading activity" style={styles.resources}>
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          style={[
            styles.skeletonResource,
            { borderColor: theme.backgroundSelected },
          ]}
        >
          <View style={[styles.skeletonAvatar, fill]} />
          <View style={styles.skeletonResourceCopy}>
            <View style={[styles.skeletonBadge, fill]} />
            <View style={[styles.skeletonResourceTitle, fill]} />
            <View style={[styles.skeletonMeta, fill]} />
            <View style={styles.skeletonResourceActions}>
              <View style={[styles.skeletonResourceButton, fill]} />
              <View style={[styles.skeletonResourceButton, fill]} />
            </View>
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
  avatar: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    overflow: "hidden",
    width: 36,
  },
  avatarFallback: { fontSize: 11, fontWeight: "700" },
  branch: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 10 },
  branchText: { flex: 1, fontFamily: Fonts.mono, fontSize: 11 },
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
  labels: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  metadata: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  metaText: { fontSize: 11 },
  number: { fontSize: 11, fontWeight: "600" },
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
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },
  resourceActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  resourceBadges: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  resourceBody: { flex: 1, minWidth: 0 },
  resourceButton: {
    alignItems: "center",
    borderRadius: 9,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 11,
  },
  resourceButtonText: { fontSize: 12, fontWeight: "700" },
  resources: { gap: 11 },
  resourceTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 8,
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
  skeletonAvatar: { borderRadius: 18, height: 36, width: 36 },
  skeletonBadge: { borderRadius: 8, height: 20, width: 66 },
  skeletonIdentity: { alignItems: "center", flexDirection: "row", gap: 11 },
  skeletonIdentityCopy: { flex: 1, gap: 7 },
  skeletonMeta: { borderRadius: 5, height: 10, width: "62%" },
  skeletonName: { borderRadius: 6, height: 23, width: "72%" },
  skeletonOwner: { borderRadius: 5, height: 11, width: "38%" },
  skeletonRepoIcon: { borderRadius: 12, height: 44, width: 44 },
  skeletonResource: {
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 11,
    minHeight: 166,
    padding: 14,
  },
  skeletonResourceActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  skeletonResourceButton: { borderRadius: 9, height: 36, width: 92 },
  skeletonResourceCopy: { flex: 1, gap: 12 },
  skeletonResourceTitle: { borderRadius: 6, height: 17, width: "88%" },
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
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: "700" },
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
