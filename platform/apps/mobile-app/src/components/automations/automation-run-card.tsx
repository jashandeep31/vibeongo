import type { ProjectAutomationRun } from "@repo/api-client";
import {
  useGetProjectSession,
  useRateProjectAutomationRun,
} from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
  automationRunName,
  formatAutomationDate,
  getApiErrorMessage,
  PROVIDER_LABELS,
} from "./automation-utils";

export function AutomationRunCard({
  automation,
  run,
}: {
  automation: { id: string; name: string; project_id: string };
  run: ProjectAutomationRun;
}) {
  const router = useRouter();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const sessionId = run.project_session?.id ?? null;
  const sessionQuery = useGetProjectSession(sessionId, expanded);
  const rateRun = useRateProjectAutomationRun();
  const tasks = sessionQuery.data?.data.tasks ?? [];
  const canRate =
    run.user_rating === null &&
    (run.status === "done" || run.status === "failed");
  const source = run.source[0].toUpperCase() + run.source.slice(1);
  const provider = run.provider
    ? ` · ${PROVIDER_LABELS[run.provider] ?? run.provider}`
    : "";

  const rate = async (rating: number) => {
    try {
      const response = await rateRun.mutateAsync({
        automationId: automation.id,
        runId: run.id,
        rating,
      });
      Toast.show({ type: "success", text1: response.message });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not save rating",
        text2: getApiErrorMessage(error, "Try again."),
      });
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <ThemedText numberOfLines={1} style={styles.title}>
            {automationRunName(run, automation.name)}
          </ThemedText>
          <ThemedText style={styles.meta} themeColor="textSecondary">
            {formatAutomationDate(run.created_at)} · {source}
            {provider}
          </ThemedText>
        </View>
        <StatusPill label={run.status} failed={run.status === "failed"} />
      </View>

      {run.project_session ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(
              `/projects/${automation.project_id}/sessions/${run.project_session!.id}/chat`,
            )
          }
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.link}>View session</ThemedText>
          <SymbolView
            name={{ ios: "arrow.up.right", android: "open_in_new" }}
            size={15}
            tintColor={theme.text}
          />
        </Pressable>
      ) : null}

      {canRate ? (
        <View
          accessibilityLabel="Rate this automation run"
          style={styles.rating}
        >
          <ThemedText style={styles.meta} themeColor="textSecondary">
            Rate run
          </ThemedText>
          {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
            <Pressable
              accessibilityLabel={`Rate ${value} out of 5`}
              accessibilityRole="button"
              disabled={rateRun.isPending}
              hitSlop={4}
              key={value}
              onPress={() => void rate(value)}
            >
              {rateRun.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <SymbolView
                  name={{ ios: "star", android: "star_border" }}
                  size={20}
                  tintColor={theme.textSecondary}
                />
              )}
            </Pressable>
          ))}
        </View>
      ) : null}

      {sessionId ? (
        <View style={[styles.tasks, { borderColor: theme.backgroundSelected }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={({ pressed }) => [
              styles.expandButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.title}>Tasks</ThemedText>
            <SymbolView
              name={{
                ios: expanded ? "chevron.up" : "chevron.down",
                android: expanded ? "expand_less" : "expand_more",
              }}
              size={17}
              tintColor={theme.textSecondary}
            />
          </Pressable>
          {expanded ? (
            <View style={styles.taskList}>
              {sessionQuery.isPending ? (
                <ActivityIndicator size="small" />
              ) : sessionQuery.isError ? (
                <ThemedText style={styles.error}>
                  Tasks could not be loaded.
                </ThemedText>
              ) : tasks.length === 0 ? (
                <ThemedText themeColor="textSecondary">
                  No tasks in this session.
                </ThemedText>
              ) : (
                tasks.map((task, index) => (
                  <View key={task.id} style={styles.taskRow}>
                    <SymbolView
                      name={{
                        ios: task.done ? "checkmark.circle.fill" : "circle",
                        android: task.done
                          ? "check_circle"
                          : "radio_button_unchecked",
                      }}
                      size={17}
                      tintColor={task.done ? "#16a34a" : theme.textSecondary}
                    />
                    <ThemedText
                      style={[styles.taskText, task.done && styles.completed]}
                      themeColor={task.done ? "textSecondary" : "text"}
                    >
                      {index + 1}. {task.task}
                    </ThemedText>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function StatusPill({
  label,
  failed = false,
}: {
  label: string;
  failed?: boolean;
}) {
  return (
    <View style={[styles.pill, failed && styles.failedPill]}>
      <ThemedText style={[styles.pillText, failed && styles.failedText]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 12,
  },
  completed: { textDecorationLine: "line-through" },
  error: { color: "#dc2626", fontSize: 13 },
  expandButton: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 38,
  },
  failedPill: { backgroundColor: "rgba(220,38,38,0.12)" },
  failedText: { color: "#dc2626" },
  flex: { flex: 1 },
  headingRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  link: { fontSize: 13, fontWeight: "700" },
  linkButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
  },
  meta: { fontSize: 11, marginTop: 2 },
  pill: {
    backgroundColor: "rgba(127,127,127,0.14)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  pressed: { opacity: 0.65 },
  rating: { alignItems: "center", flexDirection: "row", gap: 8 },
  taskList: { gap: 9, paddingTop: 8 },
  taskRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  tasks: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 5 },
  taskText: { flex: 1, fontSize: 13, lineHeight: 19 },
  title: { fontSize: 13, fontWeight: "700" },
});
