import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import {
  generateFixForIssue,
  generateReviewForPullRequest,
  getGithubRepoIssues,
  getGithubRepoPullRequests,
  scheduleGithubRepoOverview,
  type GithubRepo,
  type GithubRepoIssue,
  type GithubRepoPullRequest,
} from "./github-repos-api";
import { AutomationSettingsModal } from "./repository-modals";

type ActivityTab = "pull-requests" | "issues";

export function GithubRepoDetailScreen() {
  const { repoId } = useLocalSearchParams<{ repoId: string }>();
  const router = useRouter();
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const [repo, setRepo] = useState<GithubRepo | null>(null);
  const [pullRequests, setPullRequests] = useState<GithubRepoPullRequest[]>([]);
  const [issues, setIssues] = useState<GithubRepoIssue[]>([]);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [pullRequestError, setPullRequestError] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [activeTab, setActiveTab] = useState<ActivityTab>("pull-requests");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [schedulingOverview, setSchedulingOverview] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal, refreshing = false) => {
      if (!repoId) {
        setRepoError("The repository link is invalid.");
        setIsLoading(false);
        return;
      }
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setRepoError(null);
      setPullRequestError(null);
      setIssueError(null);

      const [pullRequestResult, issueResult] = await Promise.allSettled([
        getGithubRepoPullRequests(repoId, signal),
        getGithubRepoIssues(repoId, signal),
      ]);

      if (signal?.aborted) return;
      if (pullRequestResult.status === "fulfilled") {
        setRepo(pullRequestResult.value);
        setPullRequests(pullRequestResult.value.pull_requests);
      } else {
        setPullRequestError(
          errorMessage(
            pullRequestResult.reason,
            "Pull requests could not be loaded.",
          ),
        );
      }
      if (issueResult.status === "fulfilled") {
        setRepo((current) => current ?? issueResult.value);
        setIssues(issueResult.value.issues);
      } else {
        setIssueError(
          errorMessage(issueResult.reason, "Issues could not be loaded."),
        );
      }
      if (
        pullRequestResult.status === "rejected" &&
        issueResult.status === "rejected"
      ) {
        setRepoError("Repository activity could not be loaded.");
      }
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [repoId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const openGithub = async (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.hostname !== "github.com")
        throw new Error();
      if (!(await Linking.canOpenURL(parsed.toString()))) throw new Error();
      await Linking.openURL(parsed.toString());
    } catch {
      Alert.alert(
        "Could not open GitHub",
        "This GitHub link is invalid or unavailable.",
      );
    }
  };

  const queueOverview = async () => {
    if (!repo || schedulingOverview) return;
    setSchedulingOverview(true);
    try {
      await scheduleGithubRepoOverview(repo.id);
      await load(undefined, true);
      Alert.alert(
        repo.overview.trim()
          ? "Overview refresh queued"
          : "Overview generation queued",
        "Pull down to refresh after generation finishes.",
      );
    } catch (error) {
      Alert.alert(
        "Could not queue overview",
        errorMessage(error, "Please try again."),
      );
    } finally {
      setSchedulingOverview(false);
    }
  };

  const confirmOverview = () => {
    if (!repo?.overview.trim()) {
      void queueOverview();
      return;
    }
    Alert.alert(
      "Refresh repository overview?",
      "The current overview will be replaced when generation finishes.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Refresh overview", onPress: () => void queueOverview() },
      ],
    );
  };

  const runAutomation = async (
    type: "issue" | "pull-request",
    number: number,
  ) => {
    if (!repo?.default_project_id) {
      Alert.alert(
        "Default project required",
        "Choose a default project before starting an AI task.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Choose project", onPress: () => setSettingsVisible(true) },
        ],
      );
      return;
    }
    const key = `${type}-${number}`;
    setPendingAction(key);
    try {
      if (type === "issue") await generateFixForIssue(repo.id, number);
      else await generateReviewForPullRequest(repo.id, number);
      Alert.alert(type === "issue" ? "AI fix started" : "AI review started");
    } catch (error) {
      Alert.alert(
        type === "issue"
          ? "Could not start issue fix"
          : "Could not start review",
        errorMessage(error, "Please try again."),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const confirmAutomation = (
    type: "issue" | "pull-request",
    number: number,
  ) => {
    if (!repo?.default_project_id) {
      void runAutomation(type, number);
      return;
    }
    Alert.alert(
      type === "issue" ? "Generate issue fix?" : "Review pull request?",
      `Start an AI ${type === "issue" ? "fix" : "review"} for #${number}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: type === "issue" ? "Generate fix" : "Start review",
          onPress: () => void runAutomation(type, number),
        },
      ],
    );
  };

  const openPullRequests = pullRequests.filter(
    (item) => item.state === "open",
  ).length;
  const openIssues = issues.filter((item) => item.state === "open").length;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityLabel="Back to repositories"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            size={20}
            tintColor={colors.text}
          />
        </Pressable>
        <Text
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.text }]}
        >
          {repo?.full_name ?? "Repository"}
        </Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load(undefined, true)}
            tintColor={colors.brand}
          />
        }
      >
        {isLoading ? (
          <DetailSkeleton colors={colors} />
        ) : repoError || !repo ? (
          <StateCard
            colors={colors}
            description={repoError ?? "This repository is unavailable."}
            title="Repository activity could not be loaded"
          >
            <OutlineButton
              colors={colors}
              label="Try again"
              onPress={() => void load()}
            />
          </StateCard>
        ) : (
          <>
            <RepositoryHeader colors={colors} repo={repo} />
            <View style={styles.actions}>
              {repo.overview ? (
                <OutlineButton
                  colors={colors}
                  label={showOverview ? "Hide overview" : "Show overview"}
                  onPress={() => setShowOverview((current) => !current)}
                />
              ) : null}
              <OutlineButton
                colors={colors}
                disabled={schedulingOverview}
                label={
                  schedulingOverview
                    ? "Queuing…"
                    : repo.overview.trim()
                      ? "Refresh overview"
                      : "Create overview"
                }
                loading={schedulingOverview}
                onPress={confirmOverview}
              />
              <OutlineButton
                colors={colors}
                label="Automation"
                onPress={() => setSettingsVisible(true)}
              />
              <OutlineButton
                colors={colors}
                label="View on GitHub"
                onPress={() =>
                  void openGithub(`https://github.com/${repo.full_name}`)
                }
              />
            </View>

            {showOverview && repo.overview ? (
              <View
                style={[
                  styles.overview,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  selectable
                  style={[styles.overviewText, { color: colors.textSecondary }]}
                >
                  {repo.overview}
                </Text>
              </View>
            ) : null}

            {!repo.default_project_id ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSettingsVisible(true)}
                style={({ pressed }) => [
                  styles.warning,
                  { backgroundColor: colors.warningSurface },
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon
                  name={{
                    ios: "exclamationmark.triangle",
                    android: "warning",
                    web: "warning",
                  }}
                  size={20}
                  tintColor={colors.warning}
                />
                <View style={styles.warningCopy}>
                  <Text
                    style={[styles.warningTitle, { color: colors.warning }]}
                  >
                    Default project required
                  </Text>
                  <Text style={[styles.warningText, { color: colors.warning }]}>
                    Choose a project before reviewing pull requests or
                    generating issue fixes. Tap to configure.
                  </Text>
                </View>
              </Pressable>
            ) : null}

            <View
              accessibilityRole="tablist"
              style={[
                styles.tabs,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <TabButton
                colors={colors}
                count={openPullRequests}
                label="Pull requests"
                onPress={() => setActiveTab("pull-requests")}
                selected={activeTab === "pull-requests"}
              />
              <TabButton
                colors={colors}
                count={openIssues}
                label="Issues"
                onPress={() => setActiveTab("issues")}
                selected={activeTab === "issues"}
              />
            </View>

            {activeTab === "pull-requests" ? (
              <ActivityList
                colors={colors}
                emptyTitle="No pull requests found"
                error={pullRequestError}
                items={pullRequests.map((pullRequest) => (
                  <PullRequestCard
                    colors={colors}
                    key={pullRequest.id}
                    onOpen={() => void openGithub(pullRequest.html_url)}
                    onReview={() =>
                      confirmAutomation("pull-request", pullRequest.number)
                    }
                    pending={
                      pendingAction === `pull-request-${pullRequest.number}`
                    }
                    pullRequest={pullRequest}
                  />
                ))}
              />
            ) : (
              <ActivityList
                colors={colors}
                emptyTitle="No issues found"
                error={issueError}
                items={issues.map((issue) => (
                  <IssueCard
                    colors={colors}
                    issue={issue}
                    key={issue.id}
                    onFix={() => confirmAutomation("issue", issue.number)}
                    onOpen={() => void openGithub(issue.html_url)}
                    pending={pendingAction === `issue-${issue.number}`}
                  />
                ))}
              />
            )}
          </>
        )}
      </ScrollView>

      <AutomationSettingsModal
        colors={colors}
        onClose={() => setSettingsVisible(false)}
        onSaved={() => {
          Alert.alert("Automation settings updated");
          void load();
        }}
        repo={repo}
        visible={settingsVisible}
      />
    </SafeAreaView>
  );
}

function RepositoryHeader({
  colors,
  repo,
}: {
  colors: AppColors;
  repo: GithubRepo;
}) {
  return (
    <View style={[styles.repoHeader, { borderBottomColor: colors.border }]}>
      <View style={[styles.repoIcon, { backgroundColor: colors.primary }]}>
        <AppIcon
          name={{
            ios: "chevron.left.forwardslash.chevron.right",
            android: "code",
            web: "code",
          }}
          size={22}
          tintColor={colors.primaryForeground}
        />
      </View>
      <View style={styles.repoIdentity}>
        <Text style={[styles.owner, { color: colors.textSecondary }]}>
          {repo.repo_owner_username}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.repoName, { color: colors.text }]}
        >
          {repo.full_name.split("/").at(-1)}
        </Text>
      </View>
      <StatusBadge colors={colors} label={repo.public ? "Public" : "Private"} />
    </View>
  );
}

function DetailSkeleton({ colors }: { colors: AppColors }) {
  return (
    <View
      accessibilityLabel="Loading repository activity"
      style={styles.skeleton}
    >
      <View style={styles.skeletonHeader}>
        <View
          style={[
            styles.skeletonIcon,
            { backgroundColor: colors.backgroundElement },
          ]}
        />
        <View style={styles.skeletonCopy}>
          <View
            style={[
              styles.skeletonLineShort,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
          <View
            style={[
              styles.skeletonLineMedium,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
        </View>
      </View>
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ActivityIndicator color={colors.brand} size="small" />
          <View
            style={[
              styles.skeletonLine,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
          <View
            style={[
              styles.skeletonLineMedium,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function PullRequestCard({
  colors,
  onOpen,
  onReview,
  pending,
  pullRequest,
}: {
  colors: AppColors;
  onOpen: () => void;
  onReview: () => void;
  pending: boolean;
  pullRequest: GithubRepoPullRequest;
}) {
  return (
    <ActivityCard
      colors={colors}
      body={pullRequest.body}
      number={pullRequest.number}
      title={pullRequest.title}
    >
      <View style={styles.metaRow}>
        <StatusBadge
          colors={colors}
          label={
            pullRequest.merged_at ? "Merged" : titleCase(pullRequest.state)
          }
          tone={
            pullRequest.merged_at
              ? "merged"
              : pullRequest.state === "open"
                ? "open"
                : "closed"
          }
        />
        {pullRequest.draft ? (
          <StatusBadge colors={colors} label="Draft" />
        ) : null}
      </View>
      <Text style={[styles.metadata, { color: colors.textSecondary }]}>
        {pullRequest.user?.login ?? "Unknown author"} ·{" "}
        {formatDate(pullRequest.created_at)}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.metadata, { color: colors.textSecondary }]}
      >
        {pullRequest.head.ref} → {pullRequest.base.ref}
      </Text>
      <CardActions
        colors={colors}
        primaryLabel="Review"
        loading={pending}
        onOpen={onOpen}
        onPrimary={onReview}
      />
    </ActivityCard>
  );
}

function IssueCard({
  colors,
  issue,
  onFix,
  onOpen,
  pending,
}: {
  colors: AppColors;
  issue: GithubRepoIssue;
  onFix: () => void;
  onOpen: () => void;
  pending: boolean;
}) {
  return (
    <ActivityCard
      colors={colors}
      body={issue.body}
      number={issue.number}
      title={issue.title}
    >
      <StatusBadge
        colors={colors}
        label={titleCase(issue.state)}
        tone={issue.state === "open" ? "open" : "closed"}
      />
      {issue.labels.length ? (
        <View style={styles.labelRow}>
          {issue.labels.map((label, index) => (
            <StatusBadge
              colors={colors}
              key={`${label.id ?? label.name}-${index}`}
              label={label.name ?? "Label"}
            />
          ))}
        </View>
      ) : null}
      <Text style={[styles.metadata, { color: colors.textSecondary }]}>
        {issue.user?.login ?? "Unknown author"} · {formatDate(issue.created_at)}{" "}
        · {issue.comments} comments
      </Text>
      <CardActions
        colors={colors}
        primaryLabel="Generate fix"
        loading={pending}
        onOpen={onOpen}
        onPrimary={onFix}
      />
    </ActivityCard>
  );
}

function ActivityCard({
  body,
  children,
  colors,
  number,
  title,
}: {
  body: string | null;
  children: ReactNode;
  colors: AppColors;
  number: number;
  title: string;
}) {
  return (
    <View
      style={[
        styles.activityCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.number, { color: colors.textSecondary }]}>
        #{number}
      </Text>
      <Text style={[styles.activityTitle, { color: colors.text }]}>
        {title}
      </Text>
      {body ? (
        <Text
          numberOfLines={3}
          style={[styles.body, { color: colors.textSecondary }]}
        >
          {body}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function CardActions({
  colors,
  loading,
  onOpen,
  onPrimary,
  primaryLabel,
}: {
  colors: AppColors;
  loading: boolean;
  onOpen: () => void;
  onPrimary: () => void;
  primaryLabel: string;
}) {
  return (
    <View style={styles.cardActions}>
      <OutlineButton colors={colors} label="Open on GitHub" onPress={onOpen} />
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={onPrimary}
        style={({ pressed }) => [
          styles.primarySmall,
          { backgroundColor: colors.primary },
          loading && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} size="small" />
        ) : null}
        <Text
          style={[styles.primarySmallText, { color: colors.primaryForeground }]}
        >
          {loading ? "Starting…" : primaryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function ActivityList({
  colors,
  emptyTitle,
  error,
  items,
}: {
  colors: AppColors;
  emptyTitle: string;
  error: string | null;
  items: ReactNode[];
}) {
  if (error)
    return (
      <StateCard
        colors={colors}
        description={error}
        title={`${emptyTitle.replace("No ", "").replace(" found", "")} could not be loaded`}
      />
    );
  if (!items.length)
    return (
      <StateCard
        colors={colors}
        description="This repository does not have anything to show here yet."
        title={emptyTitle}
      />
    );
  return <View style={styles.activityList}>{items}</View>;
}

function StateCard({
  children,
  colors,
  description,
  title,
}: {
  children?: ReactNode;
  colors: AppColors;
  description: string;
  title: string;
}) {
  return (
    <View
      style={[
        styles.stateCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.stateDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {children}
    </View>
  );
}

function TabButton({
  colors,
  count,
  label,
  onPress,
  selected,
}: {
  colors: AppColors;
  count: number;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        selected && { backgroundColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.tabText,
          { color: selected ? colors.primaryForeground : colors.textSecondary },
        ]}
      >
        {label} {count}
      </Text>
    </Pressable>
  );
}

function StatusBadge({
  colors,
  label,
  tone,
}: {
  colors: AppColors;
  label: string;
  tone?: "closed" | "merged" | "open";
}) {
  const backgroundColor =
    tone === "open"
      ? colors.successSurface
      : tone === "merged"
        ? colors.backgroundSelected
        : colors.backgroundElement;
  const color = tone === "open" ? colors.success : colors.textSecondary;
  return (
    <View
      style={[styles.badge, { backgroundColor, borderColor: colors.border }]}
    >
      <Text numberOfLines={1} style={[styles.badgeText, { color }]}>
        {label}
      </Text>
    </View>
  );
}

function OutlineButton({
  colors,
  disabled = false,
  label,
  loading = false,
  onPress,
}: {
  colors: AppColors;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        { borderColor: colors.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.text} size="small" /> : null}
      <Text style={[styles.outlineButtonText, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value ? value[0]!.toUpperCase() + value.slice(1) : "Unknown";
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === "AbortError") return fallback;
  return error instanceof Error ? error.message : fallback;
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  activityCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.five,
  },
  activityList: { gap: Spacing.four },
  activityTitle: { fontSize: 16, fontWeight: "700", lineHeight: 23 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  body: { fontSize: 13, lineHeight: 20 },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  content: {
    gap: Spacing.five,
    padding: Spacing.five,
    paddingBottom: Spacing.ten,
  },
  disabled: { opacity: 0.45 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.two,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  iconButton: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  labelRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  metadata: { fontSize: 12, lineHeight: 18 },
  number: { fontSize: 12, fontWeight: "600" },
  outlineButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
  },
  outlineButtonText: { fontSize: 13, fontWeight: "600" },
  overview: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    maxHeight: 260,
    padding: Spacing.five,
  },
  overviewText: { fontSize: 13, lineHeight: 21 },
  owner: { fontSize: 12 },
  pressed: { opacity: 0.58 },
  primarySmall: {
    alignItems: "center",
    borderRadius: Radius.medium,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
  },
  primarySmallText: { fontSize: 13, fontWeight: "700" },
  repoHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  repoIcon: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  repoIdentity: { flex: 1, minWidth: 0 },
  repoName: { fontSize: 25, fontWeight: "700", letterSpacing: -0.6 },
  safeArea: { flex: 1 },
  skeleton: { gap: Spacing.four },
  skeletonCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.four,
    minHeight: 150,
    padding: Spacing.five,
  },
  skeletonCopy: { flex: 1, gap: Spacing.two },
  skeletonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  skeletonIcon: { borderRadius: Radius.medium, height: 46, width: 46 },
  skeletonLine: { borderRadius: Radius.pill, height: 12, width: "100%" },
  skeletonLineMedium: { borderRadius: Radius.pill, height: 12, width: "65%" },
  skeletonLineShort: { borderRadius: Radius.pill, height: 9, width: "35%" },
  stateCard: {
    alignItems: "center",
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    justifyContent: "center",
    minHeight: 220,
    padding: Spacing.seven,
  },
  stateDescription: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  tab: {
    alignItems: "center",
    borderRadius: Radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.three,
  },
  tabText: { fontSize: 13, fontWeight: "700" },
  tabs: {
    borderRadius: Radius.pill,
    flexDirection: "row",
    padding: Spacing.one,
  },
  warning: {
    alignItems: "flex-start",
    borderRadius: Radius.medium,
    flexDirection: "row",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  warningCopy: { flex: 1, gap: Spacing.one },
  warningText: { fontSize: 12, lineHeight: 18 },
  warningTitle: { fontSize: 14, fontWeight: "700" },
});
