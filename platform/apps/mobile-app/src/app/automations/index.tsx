import {
  useGetProjectAutomations,
  useTriggerProjectAutomation,
} from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
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

import {
  getApiErrorMessage,
  scheduleLabel,
} from "@/components/automations/automation-utils";
import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export default function AutomationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const query = useGetProjectAutomations();
  const trigger = useTriggerProjectAutomation();
  const [runningId, setRunningId] = useState<string | null>(null);
  const automations = query.data?.automations ?? [];

  const run = async (id: string) => {
    setRunningId(id);
    try {
      const response = await trigger.mutateAsync(id);
      Toast.show({ type: "success", text1: response.message });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not trigger automation",
        text2: getApiErrorMessage(error, "Try again."),
      });
    } finally {
      setRunningId(null);
    }
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
              <HeaderButton
                onPress={() => router.push("/automations/create" as never)}
              />
            }
            title="Automations"
            titleOpacity={titleOpacity}
          />
        }
      >
        {({ topInset }) => (
          <View style={[styles.screen, { paddingTop: topInset }]}>
            {query.isPending ? (
              <Centered>
                <ActivityIndicator />
                <ThemedText themeColor="textSecondary">
                  Loading automations…
                </ThemedText>
              </Centered>
            ) : query.isError ? (
              <Centered>
                <ThemedText style={styles.stateTitle}>
                  Automations could not be loaded
                </ThemedText>
                <ActionButton
                  label="Try again"
                  onPress={() => void query.refetch()}
                />
              </Centered>
            ) : automations.length === 0 ? (
              <Centered>
                <SymbolView
                  name={{ ios: "gearshape.2", android: "automation" }}
                  size={34}
                  tintColor={theme.textSecondary}
                />
                <ThemedText style={styles.stateTitle}>
                  No automations yet
                </ThemedText>
                <ThemedText style={styles.stateCopy} themeColor="textSecondary">
                  Run agent tasks manually or on a recurring schedule.
                </ThemedText>
                <ActionButton
                  label="Create automation"
                  onPress={() => router.push("/automations/create" as never)}
                />
              </Centered>
            ) : (
              <ScrollView
                contentContainerStyle={styles.content}
                onScroll={onTitleScroll}
                refreshControl={
                  <RefreshControl
                    refreshing={query.isRefetching}
                    onRefresh={() => void query.refetch()}
                  />
                }
                scrollEventThrottle={16}
              >
                {automations.map((automation) => (
                  <Pressable
                    accessibilityRole="button"
                    key={automation.id}
                    onPress={() =>
                      router.push(`/automations/${automation.id}` as never)
                    }
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.cardHeading}>
                      <View style={styles.flex}>
                        <ThemedText numberOfLines={1} style={styles.cardTitle}>
                          {automation.name}
                        </ThemedText>
                        <ThemedText
                          numberOfLines={1}
                          style={styles.meta}
                          themeColor="textSecondary"
                        >
                          {automation.project_name}
                        </ThemedText>
                      </View>
                      <Pill
                        label={automation.enabled ? "Enabled" : "Disabled"}
                      />
                    </View>
                    <ThemedText
                      numberOfLines={2}
                      style={styles.description}
                      themeColor="textSecondary"
                    >
                      {automation.description || "No description provided."}
                    </ThemedText>
                    <View
                      style={[
                        styles.cardFooter,
                        { borderColor: theme.backgroundSelected },
                      ]}
                    >
                      <ThemedText
                        numberOfLines={1}
                        style={[styles.meta, styles.flex]}
                        themeColor="textSecondary"
                      >
                        {scheduleLabel(automation.cron_expression)}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        disabled={trigger.isPending}
                        onPress={(event) => {
                          event.stopPropagation();
                          void run(automation.id);
                        }}
                        style={({ pressed }) => [
                          styles.runButton,
                          { backgroundColor: theme.text },
                          pressed && styles.pressed,
                        ]}
                      >
                        {runningId === automation.id ? (
                          <ActivityIndicator
                            color={theme.background}
                            size="small"
                          />
                        ) : (
                          <SymbolView
                            name={{ ios: "play.fill", android: "play_arrow" }}
                            size={15}
                            tintColor={theme.background}
                          />
                        )}
                        <ThemedText
                          style={[styles.runText, { color: theme.background }]}
                        >
                          {runningId === automation.id
                            ? "Starting…"
                            : "Run now"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

function HeaderButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel="Create automation"
      accessibilityRole="button"
      onPress={onPress}
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
      />
    </Pressable>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}
function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: theme.text },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={[styles.actionText, { color: theme.background }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <ThemedText style={styles.pillText}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 11,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  actionText: { fontSize: 13, fontWeight: "700" },
  card: {
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 15,
  },
  cardFooter: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
  },
  cardHeading: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  centered: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 28,
  },
  content: { gap: 12, padding: 18, paddingBottom: 36 },
  description: { fontSize: 13, lineHeight: 19, minHeight: 38 },
  flex: { flex: 1 },
  headerButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  meta: { fontSize: 12 },
  pill: {
    backgroundColor: "rgba(127,127,127,0.14)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  runButton: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  runText: { fontSize: 12, fontWeight: "700" },
  screen: { flex: 1 },
  stateCopy: { fontSize: 13, textAlign: "center" },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
});
