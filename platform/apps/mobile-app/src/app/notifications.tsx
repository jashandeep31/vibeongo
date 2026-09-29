import type { AppNotification } from "@repo/api-client";
import {
  useMarkAllNotificationsRead,
  useNotifications,
} from "@repo/api-hooks";
import { useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationPermissionWarning } from "@/components/notifications/notification-permission-warning";
import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { clearNotificationTray } from "@/lib/notification-tray";

const UNREAD_LIMIT = 100;
const READ_LIMIT = 20;

function formatRelativeTime(value: Date | string) {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

const getNotificationUrl = (notification: AppNotification) => {
  const payload = notification.payload as { url?: unknown } | null;
  return typeof payload?.url === "string" ? payload.url : null;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const unreadQuery = useNotifications({ unread: true, limit: UNREAD_LIMIT });
  const readQuery = useNotifications({ unread: false, limit: READ_LIMIT });
  const { mutate: markAllRead } = useMarkAllNotificationsRead();
  // ids that were unread while this page was open, highlighted as new
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());

  const unread = unreadQuery.data?.notifications;

  // everything shown here counts as read, so the pushes can go
  useEffect(() => {
    void clearNotificationTray();
  }, []);

  // opening the page marks everything as read
  useEffect(() => {
    if (!unread?.length) return;

    setNewIds((current) => {
      const next = new Set(current);
      for (const notification of unread) next.add(notification.id);
      return next;
    });
    markAllRead();
    // pushes that arrived while the page was open
    void clearNotificationTray();
  }, [markAllRead, unread]);

  const notifications = useMemo(() => {
    const byId = new Map<string, AppNotification>();
    for (const notification of [
      ...(unread ?? []),
      ...(readQuery.data?.notifications ?? []),
    ]) {
      byId.set(notification.id, notification);
    }
    return [...byId.values()].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [readQuery.data, unread]);

  const sections = [
    {
      title: "New",
      items: notifications.filter(({ id }) => newIds.has(id)),
    },
    {
      title: "Earlier",
      items: notifications.filter(({ id }) => !newIds.has(id)),
    },
  ].filter((section) => section.items.length > 0);

  const isPending = unreadQuery.isPending || readQuery.isPending;
  const isError = unreadQuery.isError || readQuery.isError;
  const refetch = () => {
    void unreadQuery.refetch();
    void readQuery.refetch();
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
            title="Notifications"
            titleOpacity={titleOpacity}
          />
        }
      >
        {({ topInset }) => (
          <View style={[styles.screen, { paddingTop: topInset }]}>
            {isPending ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary">
                  Loading notifications…
                </ThemedText>
              </View>
            ) : isError ? (
              <View style={styles.centeredState}>
                <ThemedText style={styles.stateTitle}>
                  Could not load notifications
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={refetch}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: theme.text },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    style={[styles.buttonLabel, { color: theme.background }]}
                  >
                    Try again
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.content}
                onScroll={onTitleScroll}
                refreshControl={
                  <RefreshControl
                    onRefresh={refetch}
                    refreshing={
                      unreadQuery.isRefetching || readQuery.isRefetching
                    }
                    tintColor={theme.textSecondary}
                  />
                }
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
              >
                <NotificationPermissionWarning style={styles.permissionWarning} />
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <SymbolView
                      name={{ ios: "bell", android: "notifications" }}
                      size={26}
                      tintColor={theme.textSecondary}
                    />
                    <ThemedText style={styles.emptyTitle}>
                      You're all caught up
                    </ThemedText>
                    <ThemedText
                      style={styles.emptyDescription}
                      themeColor="textSecondary"
                    >
                      Notifications about your tasks and automations show up
                      here.
                    </ThemedText>
                  </View>
                ) : (
                  sections.map((section) => (
                    <View key={section.title} style={styles.section}>
                      <ThemedText
                        style={styles.sectionTitle}
                        themeColor="textSecondary"
                      >
                        {section.title}
                      </ThemedText>
                      {section.items.map((notification, index) => (
                        <NotificationRow
                          isNew={newIds.has(notification.id)}
                          key={notification.id}
                          notification={notification}
                          showDivider={index > 0}
                        />
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

function NotificationRow({
  isNew,
  notification,
  showDivider,
}: {
  isNew: boolean;
  notification: AppNotification;
  showDivider: boolean;
}) {
  const router = useRouter();
  const theme = useTheme();
  const url = getNotificationUrl(notification);

  return (
    <Pressable
      accessibilityLabel={`${isNew ? "New: " : ""}${notification.title}`}
      accessibilityRole={url ? "link" : "text"}
      disabled={!url}
      onPress={() => url && router.push(url as Href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.dotColumn}>
        {isNew ? <View style={styles.newDot} /> : null}
      </View>
      <View
        style={[
          styles.rowContent,
          showDivider && {
            borderTopColor: theme.backgroundSelected,
            borderTopWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <ThemedText
          numberOfLines={2}
          style={[styles.title, isNew && styles.titleNew]}
        >
          {notification.title}
        </ThemedText>
        {notification.body ? (
          <ThemedText
            numberOfLines={3}
            style={styles.body}
            themeColor="textSecondary"
          >
            {notification.body}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.time} themeColor="textSecondary">
          {formatRelativeTime(notification.created_at)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20, paddingTop: 18 },
  centeredState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  stateTitle: { fontSize: 18, fontWeight: "700" },
  retryButton: {
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonLabel: { fontSize: 13, fontWeight: "700" },
  permissionWarning: { marginBottom: 12 },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  emptyDescription: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 2,
    paddingLeft: 18,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row" },
  // fixed width so titles line up with and without the dot
  dotColumn: { paddingTop: 21, width: 18 },
  newDot: {
    backgroundColor: "#ef4444",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  rowContent: { flex: 1, gap: 3, paddingVertical: 14 },
  title: { fontSize: 15, fontWeight: "500", lineHeight: 20 },
  titleNew: { fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  pressed: { opacity: 0.7 },
});
