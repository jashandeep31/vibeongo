import {
  useGetInstances,
  useGetProjectsWithSessions,
  useResumeProjectSession,
} from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  SessionRuntimeDrawer,
  type SessionRuntime,
} from "@/components/projects/session-runtime-drawer";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function ProjectList() {
  const theme = useTheme();
  const projectsQuery = useGetProjectsWithSessions();
  const resumeSession = useResumeProjectSession();
  const [runtimeSessionId, setRuntimeSessionId] = useState<string | null>(null);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(
    null,
  );
  const instancesQuery = useGetInstances(
    { state: "running", limit: 100 },
    Boolean(projectsQuery.data),
  );
  const projects = projectsQuery.data ?? [];
  const runningSessionIds = new Set(
    (instancesQuery.data?.data ?? []).flatMap((instance) =>
      instance.project_session_id ? [instance.project_session_id] : [],
    ),
  );

  const handleRuntimeSelect = (runtime: SessionRuntime) => {
    if (!runtimeSessionId) return;

    const sessionId = runtimeSessionId;
    setRuntimeSessionId(null);
    setResumingSessionId(sessionId);
    resumeSession.mutate(
      { id: sessionId, runtime },
      {
        onError: () => {
          Alert.alert(
            "Could not resume session",
            "Please check your connection and try again.",
          );
        },
        onSettled: () => setResumingSessionId(null),
        onSuccess: () => {
          Alert.alert("Session is starting");
        },
      },
    );
  };

  if (projectsQuery.isPending) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">Loading projects…</ThemedText>
      </View>
    );
  }

  if (projectsQuery.isError) {
    return (
      <View style={styles.centeredState}>
        <ThemedText style={styles.emptyTitle}>
          Could not load projects
        </ThemedText>
        <ThemedText style={styles.emptyDescription} themeColor="textSecondary">
          Check your connection and try again.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void projectsQuery.refetch()}
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

  if (projects.length === 0) {
    return (
      <View style={styles.centeredState}>
        <ThemedText style={styles.emptyTitle}>No projects yet</ThemedText>
        <ThemedText style={styles.emptyDescription} themeColor="textSecondary">
          Your projects and sessions will appear here.
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void Promise.all([
                projectsQuery.refetch(),
                instancesQuery.refetch(),
              ]);
            }}
            refreshing={
              projectsQuery.isRefetching || instancesQuery.isRefetching
            }
            tintColor={theme.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {projects.map((project) => (
          <View
            key={project.id}
            style={[styles.project, { borderColor: theme.backgroundSelected }]}
          >
            <View style={styles.projectHeader}>
              <SymbolView
                name={{ ios: "folder", android: "folder" }}
                size={17}
                tintColor={theme.textSecondary}
              />
              <ThemedText numberOfLines={1} style={styles.projectName}>
                {project.name}
              </ThemedText>
            </View>

            {project.sessions.length === 0 ? (
              <ThemedText style={styles.noSessions} themeColor="textSecondary">
                This project does not have any sessions yet.
              </ThemedText>
            ) : (
              <View style={styles.sessions}>
                {project.sessions.map((session) => {
                  const isRunning = runningSessionIds.has(session.id);
                  const isResuming = resumingSessionId === session.id;

                  return (
                    <View key={session.id} style={styles.sessionRow}>
                      <SymbolView
                        name={{
                          ios: "chevron.right",
                          android: "chevron_right",
                        }}
                        size={14}
                        tintColor={theme.textSecondary}
                      />
                      <ThemedText
                        numberOfLines={1}
                        style={styles.sessionName}
                        themeColor="textSecondary"
                      >
                        {session.name}
                      </ThemedText>
                      <View
                        accessibilityLabel={isRunning ? "Running" : "Stopped"}
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isRunning
                              ? "#10b981"
                              : theme.textSecondary,
                            opacity: isRunning ? 1 : 0.5,
                          },
                        ]}
                      />
                      {!isRunning ? (
                        <Pressable
                          accessibilityLabel={`Resume ${session.name}`}
                          accessibilityRole="button"
                          disabled={resumeSession.isPending}
                          onPress={() => setRuntimeSessionId(session.id)}
                          style={({ pressed }) => [
                            styles.resumeButton,
                            { backgroundColor: theme.backgroundElement },
                            (pressed || resumeSession.isPending) &&
                              styles.pressed,
                          ]}
                        >
                          {isResuming ? (
                            <ActivityIndicator size="small" />
                          ) : (
                            <SymbolView
                              name={{ ios: "play.fill", android: "play_arrow" }}
                              size={13}
                              tintColor={theme.text}
                            />
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <SessionRuntimeDrawer
        onClose={() => setRuntimeSessionId(null)}
        onSelect={handleRuntimeSelect}
        visible={runtimeSessionId !== null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  content: {
    paddingBottom: 48,
  },
  emptyDescription: {
    lineHeight: 22,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  noSessions: {
    fontSize: 14,
    lineHeight: 22,
    paddingBottom: 8,
    paddingLeft: 26,
    paddingTop: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  project: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 28,
    paddingBottom: 24,
  },
  projectHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    paddingBottom: 8,
  },
  projectName: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  retryButton: {
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  resumeButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  sessionName: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  sessionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingLeft: 2,
  },
  sessions: {
    paddingTop: 2,
  },
  statusDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
});
