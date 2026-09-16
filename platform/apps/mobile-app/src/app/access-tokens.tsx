import {
  useGitRepoAccessTokens,
  useRevokeGitRepoAccessToken,
} from "@repo/api-hooks";
import type { GitRepoAccessToken } from "@repo/api-client";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

const PAGE_LIMIT = 10;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(date);
}

export default function AccessTokensScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const [page, setPage] = useState(1);
  const tokensQuery = useGitRepoAccessTokens({ page, limit: PAGE_LIMIT });
  const revokeToken = useRevokeGitRepoAccessToken();
  const tokens = tokensQuery.data?.data ?? [];
  const currentPage = tokensQuery.data?.page ?? page;

  const revoke = (id: string) => {
    revokeToken.mutate(id, {
      onSuccess: ({ message }) =>
        Toast.show({ type: "success", text1: message }),
      onError: () =>
        Toast.show({
          type: "error",
          text1: "Failed to revoke Git access token.",
        }),
    });
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={() => router.back()}
            title="Access Tokens"
            titleOpacity={titleOpacity}
          />
        }
      >
        {({ topInset }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: topInset }]}
            onScroll={onTitleScroll}
            refreshControl={
              <RefreshControl
                onRefresh={() => void tokensQuery.refetch()}
                refreshing={tokensQuery.isRefetching}
                tintColor={theme.textSecondary}
              />
            }
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            <View style={styles.heading}>
              <ThemedText style={styles.title}>Git access tokens</ThemedText>
            </View>

            {tokensQuery.isPending ? (
              <LoadingState />
            ) : tokensQuery.isError ? (
              <MessageState
                action="Try again"
                message="Failed to load access tokens."
                onAction={() => void tokensQuery.refetch()}
              />
            ) : tokens.length === 0 ? (
              <MessageState message="No Git access tokens found." />
            ) : (
              <View
                style={[styles.list, { borderColor: theme.backgroundSelected }]}
              >
                <TableHeaderRow />
                {tokens.map((token, index) => (
                  <TokenCard
                    key={token.id}
                    isLast={index === tokens.length - 1}
                    isRevoking={
                      revokeToken.isPending &&
                      revokeToken.variables === token.id
                    }
                    onRevoke={() => revoke(token.id)}
                    token={token}
                  />
                ))}
              </View>
            )}

            <PageControls
              hasNext={tokensQuery.data?.hasNext ?? false}
              isLoading={tokensQuery.isFetching}
              onChange={setPage}
              page={currentPage}
            />
          </ScrollView>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

function TokenCard({
  isLast,
  isRevoking,
  onRevoke,
  token,
}: {
  isLast: boolean;
  isRevoking: boolean;
  onRevoke: () => void;
  token: GitRepoAccessToken;
}) {
  const theme = useTheme();
  const revoked = token.revoked_at !== null;
  const expired = new Date(token.expires_at).getTime() <= Date.now();
  const status = revoked ? "Revoked" : expired ? "Expired" : "Active";

  return (
    <View
      style={[
        styles.tableRow,
        !isLast && {
          borderBottomColor: theme.backgroundSelected,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <ThemedText numberOfLines={1} style={[styles.cell, styles.providerCell]}>
        {token.provider === "github" ? "GitHub" : "Forgejo"}
      </ThemedText>
      <ThemedText numberOfLines={1} style={[styles.cell, styles.tokenCell]}>
        {token.provider_token_id ?? "—"}
      </ThemedText>
      <ThemedText
        numberOfLines={1}
        style={[styles.cell, styles.dateCell]}
        themeColor="textSecondary"
      >
        {formatDate(token.expires_at)}
      </ThemedText>
      <ThemedText
        numberOfLines={1}
        style={[
          styles.cell,
          styles.statusCell,
          status === "Active" && styles.active,
        ]}
        themeColor={status === "Active" ? undefined : "textSecondary"}
      >
        {status}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: revoked || isRevoking }}
        disabled={revoked || isRevoking}
        hitSlop={8}
        onPress={onRevoke}
        style={({ pressed }) => [
          styles.actionCell,
          (revoked || isRevoking) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText numberOfLines={1} style={styles.revokeText}>
          {isRevoking ? "…" : revoked ? "—" : "Revoke"}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function TableHeaderRow() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.tableHeader,
        { borderBottomColor: theme.backgroundSelected },
      ]}
    >
      <ThemedText style={[styles.headerText, styles.providerCell]}>
        Provider
      </ThemedText>
      <ThemedText style={[styles.headerText, styles.tokenCell]}>
        Token
      </ThemedText>
      <ThemedText style={[styles.headerText, styles.dateCell]}>
        Expires
      </ThemedText>
      <ThemedText style={[styles.headerText, styles.statusCell]}>
        Status
      </ThemedText>
      <ThemedText style={[styles.headerText, styles.actionCell]}>
        Action
      </ThemedText>
    </View>
  );
}

function PageControls({
  hasNext,
  isLoading,
  onChange,
  page,
}: {
  hasNext: boolean;
  isLoading: boolean;
  onChange: (page: number) => void;
  page: number;
}) {
  const theme = useTheme();
  return (
    <View style={styles.pagination}>
      <PageButton
        disabled={isLoading || page <= 1}
        direction="back"
        onPress={() => onChange(Math.max(1, page - 1))}
      />
      <ThemedText themeColor="textSecondary">Page {page}</ThemedText>
      <PageButton
        disabled={isLoading || !hasNext}
        direction="forward"
        onPress={() => onChange(page + 1)}
      />
      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} size="small" />
      ) : null}
    </View>
  );
}

function PageButton({
  disabled,
  direction,
  onPress,
}: {
  disabled: boolean;
  direction: "back" | "forward";
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={`${direction === "back" ? "Previous" : "Next"} page`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pageButton,
        { borderColor: theme.backgroundSelected },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={
          direction === "back"
            ? { ios: "chevron.left", android: "chevron_left" }
            : { ios: "chevron.right", android: "chevron_right" }
        }
        size={18}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

function LoadingState() {
  const theme = useTheme();
  return (
    <View style={[styles.list, { borderColor: theme.backgroundSelected }]}>
      {Array.from({ length: 4 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.loadingCard,
            { backgroundColor: theme.backgroundElement },
            index < 3 && {
              borderBottomColor: theme.backgroundSelected,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        />
      ))}
    </View>
  );
}

function MessageState({
  action,
  message,
  onAction,
}: {
  action?: string;
  message: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.messageState}>
      <ThemedText themeColor="textSecondary">{message}</ThemedText>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <ThemedText style={styles.retryText}>{action}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 36, paddingHorizontal: 18 },
  heading: { marginBottom: 16, marginTop: 14 },
  title: { fontSize: 20, fontWeight: "600", letterSpacing: -0.3 },
  list: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tableHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 40,
    paddingHorizontal: 10,
  },
  tableRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: 10,
  },
  headerText: { color: "#7c7c82", fontSize: 11, fontWeight: "600" },
  cell: { fontSize: 12 },
  providerCell: { flex: 1.2 },
  tokenCell: { flex: 1.3, fontFamily: "monospace" },
  dateCell: { flex: 1.2 },
  statusCell: { flex: 1 },
  actionCell: { alignItems: "flex-end", flex: 1 },
  active: { color: "#16a34a" },
  revokeText: { color: "#ef4444", fontSize: 12, fontWeight: "600" },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 22,
  },
  pageButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  loadingCard: { height: 52 },
  messageState: { alignItems: "center", gap: 12, paddingVertical: 60 },
  retryText: { color: "#3c87f7", fontWeight: "700" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
