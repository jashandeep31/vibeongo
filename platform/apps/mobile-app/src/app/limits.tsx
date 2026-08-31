import type { InstanceSlot } from "@repo/api-client";
import { useInstanceSlots, useInstanceSlotUsage } from "@repo/api-hooks";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

const PAGE_SIZE = 10;
const UPGRADE_EMAIL =
  "mailto:jashan.signup@gmail.com?subject=VibeOngo%20tier%20upgrade";

const statusColors: Record<InstanceSlot["status"], string> = {
  active: "#16a34a",
  provisioning: "#2563eb",
  queued: "#d97706",
  failed: "#dc2626",
  terminating: "#9333ea",
  terminated: "#64748b",
  cancelled: "#64748b",
  expired: "#64748b",
};

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function LimitsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const [page, setPage] = useState(1);
  const usageQuery = useInstanceSlotUsage();
  const slotsQuery = useInstanceSlots({
    page,
    limit: PAGE_SIZE,
  });
  const usage = usageQuery.data?.data;
  const slots = slotsQuery.data?.data ?? [];
  const currentPage = slotsQuery.data?.page ?? page;
  const isLimitReached = usage
    ? (usage.manual.limit > 0 && usage.manual.used >= usage.manual.limit) ||
      (usage.auto.limit > 0 && usage.auto.used >= usage.auto.limit)
    : false;

  const refresh = () => {
    void Promise.all([usageQuery.refetch(), slotsQuery.refetch()]);
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
            right={
              usage?.tier ? (
                <View
                  style={[
                    styles.tierBadge,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
                  <ThemedText style={styles.tierLabel}>
                    {usage.tier.replace("tier", "Tier ")}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.headerAction} />
              )
            }
            title="Limits"
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
                onRefresh={refresh}
                refreshing={usageQuery.isRefetching || slotsQuery.isRefetching}
                tintColor={theme.textSecondary}
              />
            }
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            <View style={styles.usageSection}>
              {usageQuery.isPending ? (
                <LoadingUsage />
              ) : usageQuery.isError ? (
                <ErrorState
                  label="Could not load usage limits."
                  onRetry={() => void usageQuery.refetch()}
                />
              ) : usage ? (
                <View style={styles.usageCards}>
                  <UsageCard
                    label="Manual"
                    limit={usage.manual.limit}
                    used={usage.manual.used}
                  />
                  <UsageCard
                    label="Automatic"
                    limit={usage.auto.limit}
                    used={usage.auto.used}
                  />
                </View>
              ) : null}

              {isLimitReached ? (
                <View
                  style={[
                    styles.limitAlert,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: "exclamationmark.triangle",
                      android: "warning",
                    }}
                    size={20}
                    tintColor="#d97706"
                  />
                  <View style={styles.alertCopy}>
                    <ThemedText style={styles.alertTitle}>
                      Limit reached
                    </ThemedText>
                    <ThemedText
                      style={styles.alertDescription}
                      themeColor="textSecondary"
                    >
                      Upgrade your tier to launch more instances.
                    </ThemedText>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => void Linking.openURL(UPGRADE_EMAIL)}
                    >
                      <ThemedText style={styles.emailLink}>
                        Email us for a quick upgrade
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.slotsSection,
                { borderTopColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText style={styles.sectionTitle}>Slots</ThemedText>

              {slotsQuery.isPending ? (
                <LoadingSlots />
              ) : slotsQuery.isError ? (
                <ErrorState
                  label="Could not load instance slots."
                  onRetry={() => void slotsQuery.refetch()}
                />
              ) : slots.length ? (
                <View style={styles.slotList}>
                  {slots.map((slot) => (
                    <SlotCard key={slot.id} slot={slot} />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <SymbolView
                    name={{ ios: "tray", android: "inbox" }}
                    size={26}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText themeColor="textSecondary">
                    No instance slots yet.
                  </ThemedText>
                </View>
              )}

              <PageControls
                hasNext={slotsQuery.data?.hasNext ?? false}
                isLoading={slotsQuery.isFetching}
                onChange={setPage}
                page={currentPage}
              />
            </View>
          </ScrollView>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

function UsageCard({
  label,
  limit,
  used,
}: {
  label: string;
  limit: number;
  used: number;
}) {
  const theme = useTheme();
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <View
      style={[
        styles.usageCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.usageHeader}>
        <ThemedText style={styles.usageLabel}>{label}</ThemedText>
        <ThemedText style={styles.usageValue}>
          {used} / {limit}
        </ThemedText>
      </View>
      <View
        accessibilityLabel={`${label}: ${used} of ${limit} slots used`}
        accessibilityRole="progressbar"
        accessibilityValue={{ max: limit, min: 0, now: used }}
        style={[
          styles.progressTrack,
          { backgroundColor: theme.backgroundSelected },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.text, width: `${percentage}%` },
          ]}
        />
      </View>
    </View>
  );
}

function SlotCard({ slot }: { slot: InstanceSlot }) {
  const theme = useTheme();
  const statusColor = statusColors[slot.status];
  return (
    <View style={[styles.slotCard, { borderColor: theme.backgroundSelected }]}>
      <View style={styles.slotTopRow}>
        <View
          style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <ThemedText style={[styles.statusLabel, { color: statusColor }]}>
            {slot.status}
          </ThemedText>
        </View>
        <ThemedText style={styles.slotDate} themeColor="textSecondary">
          {formatDate(slot.created_at)}
        </ThemedText>
      </View>
      <View style={styles.slotMeta}>
        <MetaValue label="Category" value={slot.category} />
        <MetaValue label="Runtime" value={slot.runtime_kind.toUpperCase()} />
      </View>
      {slot.error ? (
        <ThemedText numberOfLines={3} style={styles.slotError}>
          {slot.error}
        </ThemedText>
      ) : null}
    </View>
  );
}

function MetaValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaValue}>
      <ThemedText style={styles.metaLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.metaText}>{value}</ThemedText>
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
      <ThemedText style={styles.pageLabel} themeColor="textSecondary">
        Page {page}
      </ThemedText>
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
  direction,
  disabled,
  onPress,
}: {
  direction: "back" | "forward";
  disabled: boolean;
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

function ErrorState({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.errorState}>
      <ThemedText style={styles.errorText}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.retryLabel}>Try again</ThemedText>
      </Pressable>
    </View>
  );
}

function LoadingUsage() {
  const theme = useTheme();
  return (
    <View style={styles.usageCards}>
      {Array.from({ length: 2 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.usageCard,
            styles.usageSkeleton,
            { backgroundColor: theme.backgroundElement },
          ]}
        />
      ))}
    </View>
  );
}

function LoadingSlots() {
  const theme = useTheme();
  return (
    <View style={styles.slotList}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.slotSkeleton,
            { backgroundColor: theme.backgroundElement },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 32, paddingHorizontal: 20 },
  headerAction: { width: 42 },
  tierBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 30,
    minWidth: 52,
    paddingHorizontal: 10,
  },
  tierLabel: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  usageSection: { paddingTop: 24 },
  usageCards: { gap: 12 },
  usageCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  usageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  usageLabel: { fontSize: 14, fontWeight: "600" },
  usageValue: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  progressTrack: {
    borderRadius: 999,
    height: 6,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { borderRadius: 999, height: "100%" },
  usageSkeleton: { borderWidth: 0, height: 74 },
  limitAlert: {
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    padding: 16,
  },
  alertCopy: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: "700" },
  alertDescription: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  emailLink: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 7,
  },
  slotsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 28,
    paddingTop: 24,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  slotList: { gap: 12, marginTop: 22 },
  slotCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  slotTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusLabel: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  slotDate: { flexShrink: 1, fontSize: 11, textAlign: "right" },
  slotMeta: { flexDirection: "row", gap: 36, marginTop: 14 },
  metaValue: { gap: 2 },
  metaLabel: { fontSize: 11 },
  metaText: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  slotError: { color: "#dc2626", fontSize: 12, lineHeight: 17, marginTop: 12 },
  slotSkeleton: { borderRadius: 16, height: 106 },
  emptyState: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    minHeight: 190,
    paddingHorizontal: 20,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 20,
  },
  pageButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pageLabel: { fontSize: 13, minWidth: 56, textAlign: "center" },
  disabled: { opacity: 0.38 },
  errorState: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    minHeight: 160,
  },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  retryButton: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryLabel: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.68 },
});
