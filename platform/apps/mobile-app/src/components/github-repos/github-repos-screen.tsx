import type { GithubRepo } from "@repo/api-client";
import { useGithubRepos } from "@repo/api-hooks";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConnectGithubRepoDrawer } from "@/components/github-repos/connect-github-repo-drawer";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function GithubReposScreen() {
  const router = useRouter();
  const theme = useTheme();
  const reposQuery = useGithubRepos();
  const repos = reposQuery.data ?? [];
  const [query, setQuery] = useState("");
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const openGithubAppInstall = () => {
    void Linking.openURL(
      "https://github.com/apps/vibeongo/installations/new",
    ).catch(() =>
      Alert.alert("Could not open GitHub", "Please try again later."),
    );
  };
  const filteredRepos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return repos;
    return repos.filter((repo) =>
      repo.full_name.toLowerCase().includes(normalizedQuery),
    );
  }, [query, repos]);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View
        style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back" }}
            size={21}
            tintColor={theme.text}
            weight="medium"
          />
        </Pressable>
        <ThemedText numberOfLines={1} style={styles.headerTitle}>
          Repositories
        </ThemedText>
        <Pressable
          accessibilityLabel="Connect repository"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setIsConnectOpen(true)}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "plus", android: "add" }}
            size={20}
            tintColor={theme.text}
            weight="medium"
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            onRefresh={() => void reposQuery.refetch()}
            refreshing={reposQuery.isRefetching}
            tintColor={theme.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.search,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search" }}
            size={17}
            tintColor={theme.textSecondary}
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search repositories"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            value={query}
          />
          {query ? (
            <Pressable
              accessibilityLabel="Clear repository search"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setQuery("")}
            >
              <SymbolView
                name={{ ios: "xmark.circle.fill", android: "cancel" }}
                size={17}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>

        <View
          style={[
            styles.githubAppNotice,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <View style={styles.githubAppNoticeCopy}>
            <ThemedText style={styles.githubAppNoticeTitle}>
              Install the GitHub App first
            </ThemedText>
            <ThemedText
              style={styles.githubAppNoticeDescription}
              themeColor="textSecondary"
            >
              Install the Vibeongo GitHub App on a repository before connecting
              it here.
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel="Install GitHub App"
            accessibilityRole="link"
            onPress={openGithubAppInstall}
            style={({ pressed }) => [
              styles.githubAppInstallButton,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              style={[
                styles.githubAppInstallButtonLabel,
                { color: theme.background },
              ]}
            >
              Install App
            </ThemedText>
            <SymbolView
              name={{ ios: "arrow.up.right", android: "open_in_new" }}
              size={13}
              tintColor={theme.background}
            />
          </Pressable>
        </View>

        {reposQuery.isPending ? (
          <ScreenState label="Loading repositories…" loading />
        ) : reposQuery.isError ? (
          <ScreenState
            actionLabel="Try again"
            label="Repositories could not be loaded"
            onAction={() => void reposQuery.refetch()}
          />
        ) : filteredRepos.length === 0 ? (
          <ScreenState
            actionLabel={repos.length === 0 ? "Connect repository" : undefined}
            label={
              repos.length === 0 ? "No repositories yet" : "No matches found"
            }
            onAction={
              repos.length === 0 ? () => setIsConnectOpen(true) : undefined
            }
            secondaryLabel={
              repos.length === 0
                ? "Connect a GitHub repository to manage pull requests, issues, and automations."
                : "Try a different repository name."
            }
          />
        ) : (
          <View style={styles.repositories}>
            {filteredRepos.map((repo) => (
              <RepositoryRow
                key={repo.id}
                onPress={() =>
                  router.push({
                    pathname: "/github-repos/[repoId]",
                    params: { repoId: repo.id },
                  })
                }
                repo={repo}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ConnectGithubRepoDrawer
        onClose={() => setIsConnectOpen(false)}
        visible={isConnectOpen}
      />
    </SafeAreaView>
  );
}

function RepositoryRow({
  onPress,
  repo,
}: {
  onPress: () => void;
  repo: GithubRepo;
}) {
  const theme = useTheme();
  const repoName =
    repo.full_name.split("/").filter(Boolean).at(-1) ?? repo.full_name;

  return (
    <Pressable
      accessibilityLabel={`Open ${repo.full_name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.repository,
        { borderColor: theme.backgroundSelected },
        pressed && {
          backgroundColor: theme.backgroundElement,
          opacity: 0.82,
        },
      ]}
    >
      <View style={styles.repositoryHeader}>
        <View
          style={[
            styles.repoIcon,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <SymbolView
            name={{
              ios: "chevron.left.forwardslash.chevron.right",
              android: "code",
            }}
            size={18}
            tintColor={theme.text}
          />
        </View>
        <View style={styles.repositoryIdentity}>
          <ThemedText
            numberOfLines={1}
            style={styles.owner}
            themeColor="textSecondary"
          >
            {repo.repo_owner_username}
          </ThemedText>
          <ThemedText numberOfLines={1} style={styles.repoName}>
            {repoName}
          </ThemedText>
        </View>
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={17}
          tintColor={theme.textSecondary}
        />
      </View>

      <View style={styles.repositoryMetadata}>
        <View style={styles.metadataItem}>
          <SymbolView
            name={
              repo.public
                ? { ios: "checkmark.shield", android: "verified_user" }
                : { ios: "lock", android: "lock" }
            }
            size={12}
            tintColor={theme.textSecondary}
          />
          <ThemedText style={styles.metadataText} themeColor="textSecondary">
            {repo.public ? "Public" : "Private"}
          </ThemedText>
        </View>
        {!repo.default_project_id ? (
          <View style={styles.metadataItem}>
            <SymbolView
              name={{ ios: "exclamationmark.triangle", android: "warning" }}
              size={12}
              tintColor="#d97706"
            />
            <ThemedText style={styles.warningText}>Needs project</ThemedText>
          </View>
        ) : null}
        {repo.auto_review_pull_requests_enabled ? (
          <AutomationLabel label="Auto-review" />
        ) : null}
        {repo.auto_fix_issues_enabled ? (
          <AutomationLabel label="Auto-fix" />
        ) : null}
      </View>
    </Pressable>
  );
}

function AutomationLabel({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metadataItem}>
      <SymbolView
        name={{ ios: "sparkles", android: "auto_awesome" }}
        size={12}
        tintColor={theme.textSecondary}
      />
      <ThemedText style={styles.metadataText} themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function ScreenState({
  actionLabel,
  label,
  loading = false,
  onAction,
  secondaryLabel,
}: {
  actionLabel?: string;
  label: string;
  loading?: boolean;
  onAction?: () => void;
  secondaryLabel?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.state}>
      {loading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <SymbolView
          name={{ ios: "shippingbox", android: "inventory_2" }}
          size={30}
          tintColor={theme.textSecondary}
        />
      )}
      <ThemedText style={styles.stateTitle}>{label}</ThemedText>
      {secondaryLabel ? (
        <ThemedText style={styles.stateCopy} themeColor="textSecondary">
          {secondaryLabel}
        </ThemedText>
      ) : null}
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
          <ThemedText style={styles.stateActionLabel}>{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42, paddingHorizontal: 20, paddingTop: 16 },
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
  githubAppInstallButton: {
    alignItems: "center",
    borderRadius: 9,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  githubAppInstallButtonLabel: { fontSize: 12, fontWeight: "700" },
  githubAppNotice: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    padding: 12,
  },
  githubAppNoticeCopy: { flex: 1 },
  githubAppNoticeDescription: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  githubAppNoticeTitle: { fontSize: 13, fontWeight: "700" },
  metadataItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  metadataText: { fontSize: 11, fontWeight: "500" },
  owner: { fontSize: 11, lineHeight: 15 },
  pressed: { opacity: 0.7 },
  repoIcon: {
    alignItems: "center",
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  repoName: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  repositories: { marginTop: 10 },
  repository: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
    paddingVertical: 16,
  },
  repositoryHeader: { alignItems: "center", flexDirection: "row", gap: 11 },
  repositoryIdentity: { flex: 1, minWidth: 0 },
  repositoryMetadata: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginLeft: 51,
    marginTop: 9,
  },
  screen: { flex: 1 },
  search: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, minHeight: 44, paddingVertical: 0 },
  state: {
    alignItems: "center",
    minHeight: 280,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  stateAction: {
    borderRadius: 10,
    marginTop: 16,
    paddingHorizontal: 17,
    paddingVertical: 11,
  },
  stateActionLabel: { fontSize: 13, fontWeight: "700" },
  stateCopy: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  warningText: { color: "#d97706", fontSize: 11, fontWeight: "600" },
});
