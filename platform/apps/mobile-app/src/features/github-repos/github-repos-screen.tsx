import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import { getGithubRepos, type GithubRepo } from "./github-repos-api";
import { ConnectRepositoryModal } from "./repository-modals";

export function GithubReposScreen() {
  const router = useRouter();
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectVisible, setConnectVisible] = useState(false);

  const load = useCallback(async (signal?: AbortSignal, refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      setRepos(await getGithubRepos(signal));
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Repositories could not be loaded.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filteredRepos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return repos;
    return repos.filter((repo) =>
      repo.full_name.toLowerCase().includes(normalized),
    );
  }, [query, repos]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityLabel="Back to home"
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Repositories
        </Text>
        <View style={styles.iconButton} />
      </View>

      <FlatList
        contentContainerStyle={[
          styles.content,
          filteredRepos.length === 0 && styles.grow,
        ]}
        data={isLoading ? [] : filteredRepos}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.text }]}>
                Your repositories
              </Text>
              <Text
                style={[styles.description, { color: colors.textSecondary }]}
              >
                Review pull requests, fix issues, and configure GitHub
                automation.
              </Text>
            </View>
            <View style={styles.toolbar}>
              <View
                style={[
                  styles.search,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <AppIcon
                  name={{
                    ios: "magnifyingglass",
                    android: "search",
                    web: "search",
                  }}
                  size={17}
                  tintColor={colors.textSecondary}
                />
                <TextInput
                  accessibilityLabel="Search repositories"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setQuery}
                  placeholder="Search repositories"
                  placeholderTextColor={colors.textSecondary}
                  selectionColor={colors.brand}
                  style={[styles.searchInput, { color: colors.text }]}
                  value={query}
                />
                {query ? (
                  <Pressable
                    accessibilityLabel="Clear search"
                    onPress={() => setQuery("")}
                  >
                    <AppIcon
                      name={{
                        ios: "xmark.circle.fill",
                        android: "cancel",
                        web: "cancel",
                      }}
                      size={18}
                      tintColor={colors.textSecondary}
                    />
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConnectVisible(true)}
                style={({ pressed }) => [
                  styles.connectButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon
                  name={{ ios: "plus", android: "add", web: "add" }}
                  size={18}
                  tintColor={colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.connectText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Connect
                </Text>
              </Pressable>
            </View>
            {isLoading ? <LoadingCards colors={colors} /> : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              actionLabel={
                error
                  ? "Try again"
                  : repos.length === 0
                    ? "Connect repository"
                    : undefined
              }
              colors={colors}
              description={
                error
                  ? error
                  : repos.length === 0
                    ? "Connect a GitHub repository to see its pull requests and issues here."
                    : "Try a different repository name."
              }
              onAction={
                error
                  ? () => void load()
                  : repos.length === 0
                    ? () => setConnectVisible(true)
                    : undefined
              }
              title={
                error
                  ? "Repositories could not be loaded"
                  : repos.length === 0
                    ? "No repositories yet"
                    : "No matches found"
              }
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load(undefined, true)}
            tintColor={colors.brand}
          />
        }
        renderItem={({ item }) => (
          <RepositoryCard
            colors={colors}
            onPress={() => router.push(`/github-repos/${item.id}`)}
            repo={item}
          />
        )}
      />

      <ConnectRepositoryModal
        colors={colors}
        onAdded={() => void load()}
        onClose={() => setConnectVisible(false)}
        visible={connectVisible}
      />
    </SafeAreaView>
  );
}

function RepositoryCard({
  colors,
  onPress,
  repo,
}: {
  colors: ReturnType<typeof useTheme>;
  onPress: () => void;
  repo: GithubRepo;
}) {
  const repositoryName = repo.full_name.split("/").at(-1) ?? repo.full_name;
  return (
    <Pressable
      accessibilityHint="Opens repository activity"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.repoIcon, { backgroundColor: colors.primary }]}>
          <AppIcon
            name={{
              ios: "chevron.left.forwardslash.chevron.right",
              android: "code",
              web: "code",
            }}
            size={20}
            tintColor={colors.primaryForeground}
          />
        </View>
        <View style={styles.repoIdentity}>
          <Text
            numberOfLines={1}
            style={[styles.owner, { color: colors.textSecondary }]}
          >
            {repo.repo_owner_username}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.repoName, { color: colors.text }]}
          >
            {repositoryName}
          </Text>
        </View>
        <Badge colors={colors} label={repo.public ? "Public" : "Private"} />
      </View>

      {!repo.default_project_id ? (
        <View
          style={[styles.warning, { backgroundColor: colors.warningSurface }]}
        >
          <AppIcon
            name={{
              ios: "exclamationmark.triangle",
              android: "warning",
              web: "warning",
            }}
            size={16}
            tintColor={colors.warning}
          />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Default project not configured
          </Text>
        </View>
      ) : null}

      <Text
        numberOfLines={3}
        style={[styles.overview, { color: colors.textSecondary }]}
      >
        {repo.overview ||
          "Pull requests and issues from this repository are ready to review."}
      </Text>

      <View style={styles.automationBadges}>
        {repo.auto_review_pull_requests_enabled ? (
          <Badge colors={colors} label="Auto-review" muted />
        ) : null}
        {repo.auto_fix_issues_enabled ? (
          <Badge colors={colors} label="Auto-fix" muted />
        ) : null}
      </View>
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.cardAction, { color: colors.text }]}>
          View activity
        </Text>
        <AppIcon
          name={{
            ios: "arrow.right",
            android: "arrow_forward",
            web: "arrow_forward",
          }}
          size={17}
          tintColor={colors.text}
        />
      </View>
    </Pressable>
  );
}

function Badge({
  colors,
  label,
  muted = false,
}: {
  colors: ReturnType<typeof useTheme>;
  label: string;
  muted?: boolean;
}) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: muted ? colors.backgroundElement : "transparent",
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: muted ? colors.textSecondary : colors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function EmptyState({
  actionLabel,
  colors,
  description,
  onAction,
  title,
}: {
  actionLabel?: string;
  colors: ReturnType<typeof useTheme>;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View
      style={[
        styles.empty,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.backgroundElement },
        ]}
      >
        <AppIcon
          name={{
            ios: "shippingbox",
            android: "inventory_2",
            web: "inventory_2",
          }}
          size={25}
          tintColor={colors.textSecondary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.emptyAction,
            { borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.emptyActionText, { color: colors.text }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LoadingCards({ colors }: { colors: ReturnType<typeof useTheme> }) {
  return (
    <View accessibilityLabel="Loading repositories" style={styles.loadingCards}>
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          style={[
            styles.loadingCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.loadingHeader}>
            <View
              style={[
                styles.loadingIcon,
                { backgroundColor: colors.backgroundElement },
              ]}
            />
            <View style={styles.loadingCopy}>
              <View
                style={[
                  styles.loadingLineShort,
                  { backgroundColor: colors.backgroundElement },
                ]}
              />
              <View
                style={[
                  styles.loadingLineMedium,
                  { backgroundColor: colors.backgroundElement },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              styles.loadingLine,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
          <View
            style={[
              styles.loadingLineMedium,
              { backgroundColor: colors.backgroundElement },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  automationBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    minHeight: 25,
  },
  badge: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.four,
    marginBottom: Spacing.four,
    overflow: "hidden",
    padding: Spacing.five,
  },
  cardAction: { fontSize: 13, fontWeight: "700" },
  cardFooter: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -Spacing.five,
    marginBottom: -Spacing.five,
    padding: Spacing.five,
    paddingVertical: Spacing.four,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
  },
  cardPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  connectButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
  },
  connectText: { fontSize: 14, fontWeight: "700" },
  content: { padding: Spacing.five, paddingBottom: Spacing.ten },
  description: { fontSize: 14, lineHeight: 21 },
  empty: {
    alignItems: "center",
    borderRadius: Radius.large,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 280,
    padding: Spacing.seven,
  },
  emptyAction: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    marginTop: Spacing.four,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.five,
    justifyContent: "center",
  },
  emptyActionText: { fontSize: 14, fontWeight: "700" },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.two,
    maxWidth: 310,
    textAlign: "center",
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: 52,
    justifyContent: "center",
    marginBottom: Spacing.four,
    width: 52,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  grow: { flexGrow: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.two,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  iconButton: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  listHeader: { gap: Spacing.five },
  loadingCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.five,
    height: 190,
    padding: Spacing.five,
  },
  loadingCards: { gap: Spacing.four },
  loadingCopy: { flex: 1, gap: Spacing.two },
  loadingHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
  },
  loadingIcon: { borderRadius: Radius.medium, height: 42, width: 42 },
  loadingLine: { borderRadius: Radius.pill, height: 12, width: "100%" },
  loadingLineMedium: { borderRadius: Radius.pill, height: 12, width: "65%" },
  loadingLineShort: { borderRadius: Radius.pill, height: 9, width: "35%" },
  overview: { fontSize: 13, lineHeight: 20, minHeight: 40 },
  owner: { fontSize: 11 },
  pressed: { opacity: 0.55 },
  repoIcon: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  repoIdentity: { flex: 1, minWidth: 0 },
  repoName: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  safeArea: { flex: 1 },
  search: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 14, minWidth: 0, paddingVertical: 0 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.8 },
  titleBlock: { gap: Spacing.two },
  toolbar: { flexDirection: "row", gap: Spacing.three },
  warning: {
    alignItems: "center",
    borderRadius: Radius.small,
    flexDirection: "row",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  warningText: { flex: 1, fontSize: 12, fontWeight: "600" },
});
