import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";

import type {
  OpencodeChat,
  Project,
  ProjectSession,
  RecentChat,
} from "./types";

export type WorkspaceTab = "chats" | "projects";

type WorkspaceSectionProps = {
  activeTab: WorkspaceTab;
  chats: RecentChat[];
  colors: AppColors;
  deletingChatId: string | null;
  projects: Project[];
  actionPendingId: string | null;
  onDeleteChat: (chat: RecentChat) => void;
  onCreateProject: () => void;
  onCreateSession: (project: Project) => void;
  onResumeSession: (session: ProjectSession) => void;
  onArchiveSession: (session: ProjectSession) => void;
  onTerminateSession: (session: ProjectSession) => void;
  onNewOpencodeChat: (project: Project, session: ProjectSession) => void;
  onOpenOpencodeChat: (
    project: Project,
    session: ProjectSession,
    chat: OpencodeChat,
  ) => void;
};

function EmptyState({
  colors,
  kind,
}: {
  colors: AppColors;
  kind: WorkspaceTab;
}) {
  const chats = kind === "chats";
  return (
    <View
      style={[
        styles.empty,
        chats && { backgroundColor: colors.backgroundElement },
        !chats && styles.emptyProject,
      ]}
    >
      {chats ? (
        <AppIcon
          name={{ ios: "bubble.left.and.bubble.right", android: "chat", web: "chat" }}
          size={25}
          tintColor={colors.textSecondary}
        />
      ) : null}
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {chats ? "No recent chats" : "No projects yet"}
      </Text>
      <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
        {chats
          ? "Start with the composer above. Your conversations will appear here."
          : "Create a project to connect repositories and launch coding sessions."}
      </Text>
    </View>
  );
}

function ChatList(
  props: Pick<
    WorkspaceSectionProps,
    "chats" | "colors" | "deletingChatId" | "onDeleteChat"
  >,
) {
  const router = useRouter();
  if (props.chats.length === 0)
    return <EmptyState colors={props.colors} kind="chats" />;

  return (
    <View>
      {props.chats.map((chat, index) => (
        <View
          key={chat.id}
          style={[
            styles.chatRow,
            index < props.chats.length - 1 && {
              borderBottomColor: props.colors.border,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Pressable
            accessibilityLabel={`Open ${chat.name}`}
            accessibilityRole="button"
            onPress={() => router.push(`/chat/${chat.id}`)}
            style={({ pressed }) => [
              styles.chatMain,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.rowIcon,
                { backgroundColor: props.colors.backgroundElement },
              ]}
            >
              <AppIcon
                name={{
                  ios: "bubble.left",
                  android: "chat_bubble",
                  web: "chat_bubble",
                }}
                size={18}
                tintColor={props.colors.textSecondary}
              />
            </View>
            <View style={styles.flex}>
              <Text
                numberOfLines={1}
                style={[styles.chatName, { color: props.colors.text }]}
              >
                {chat.name}
              </Text>
              <Text
                style={[styles.meta, { color: props.colors.textSecondary }]}
              >
                Recent conversation
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel={`Delete ${chat.name}`}
            accessibilityRole="button"
            disabled={Boolean(props.deletingChatId)}
            onPress={() => props.onDeleteChat(chat)}
            style={styles.iconAction}
          >
            {props.deletingChatId === chat.id ? (
              <ActivityIndicator
                color={props.colors.destructive}
                size="small"
              />
            ) : (
              <AppIcon
                name={{
                  ios: "ellipsis",
                  android: "more_horiz",
                  web: "more_horiz",
                }}
                size={21}
                tintColor={props.colors.textSecondary}
              />
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function remainingTime(value: string, now: number) {
  const milliseconds = new Date(value).getTime() - now;
  if (!Number.isFinite(milliseconds)) return "";
  if (milliseconds <= 0) return "Expired";
  const seconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds % 60}s`;
}

function SessionCard({
  actionPendingId,
  colors,
  onArchive,
  onNewChat,
  onOpenChat,
  onResume,
  onTerminate,
  session,
}: {
  actionPendingId: string | null;
  colors: AppColors;
  onArchive: () => void;
  onNewChat: () => void;
  onOpenChat: (chat: OpencodeChat) => void;
  onResume: () => void;
  onTerminate: () => void;
  session: ProjectSession;
}) {
  const state = session.runtime?.state ?? "stopped";
  const [now, setNow] = useState(Date.now());
  const pending = actionPendingId === session.id;

  useEffect(() => {
    if (state !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state]);

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionRow}>
        <View style={styles.sessionMain}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  state === "running"
                    ? colors.success
                    : state === "processing"
                      ? colors.warning
                      : colors.textSecondary,
              },
            ]}
          />
          <View style={styles.flex}>
            <Text
              numberOfLines={1}
              style={[styles.sessionName, { color: colors.text }]}
            >
              {session.name}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {state === "running"
                ? `Running${session.runtime?.instance ? ` · ${remainingTime(session.runtime.instance.terminates_at, now)}` : ""}`
                : state === "processing"
                  ? "Starting"
                  : "Paused"}
            </Text>
          </View>
        </View>

        {pending || state === "processing" ? (
          <View style={styles.iconAction}>
            <ActivityIndicator color={colors.brand} size="small" />
          </View>
        ) : state === "stopped" ? (
          <View style={styles.inlineActions}>
            <Pressable
              accessibilityLabel={`Resume ${session.name}`}
              accessibilityRole="button"
              onPress={onResume}
              style={styles.resumeButton}
            >
              <Text style={[styles.resumeText, { color: colors.text }]}>Resume</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Archive ${session.name}`}
              accessibilityRole="button"
              onPress={onArchive}
              style={styles.quietAction}
            >
              <Text style={[styles.quietActionText, { color: colors.textSecondary }]}>Archive</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityLabel={`Terminate ${session.name}`}
            accessibilityRole="button"
            onPress={onTerminate}
            style={styles.quietAction}
          >
            <Text style={[styles.quietActionText, { color: colors.destructive }]}>Stop</Text>
          </Pressable>
        )}
      </View>

      {state === "running" ? (
        <View style={styles.opencodeList}>
          {session.runtime?.error ? (
            <Text style={[styles.chatLoadError, { color: colors.destructive }]}>
              Could not refresh chats. Pull down on Home to retry.
            </Text>
          ) : null}
          {(session.runtime?.chats ?? []).map((chat) => (
            <Pressable
              key={chat.id}
              accessibilityRole="button"
              onPress={() => onOpenChat(chat)}
              style={({ pressed }) => [
                styles.opencodeRow,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.promptMarker, { color: colors.textSecondary }]}>›</Text>
              <Text
                numberOfLines={1}
                style={[styles.opencodeTitle, { color: colors.text }]}
              >
                {chat.title || "Untitled chat"}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={onNewChat}
            style={({ pressed }) => [
              styles.opencodeRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.promptMarker, { color: colors.brand }]}>+</Text>
            <Text style={[styles.newChatText, { color: colors.brand }]}>
              New chat
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ProjectCard(
  props: Pick<
    WorkspaceSectionProps,
    | "colors"
    | "actionPendingId"
    | "onArchiveSession"
    | "onCreateSession"
    | "onNewOpencodeChat"
    | "onOpenOpencodeChat"
    | "onResumeSession"
    | "onTerminateSession"
  > & { project: Project },
) {
  const running = props.project.sessions.filter(
    (session) => session.runtime?.state === "running",
  ).length;

  return (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={styles.projectMain}>
          <View style={styles.flex}>
            <Text
              numberOfLines={1}
              style={[styles.projectName, { color: props.colors.text }]}
            >
              {props.project.name}
            </Text>
            <Text style={[styles.meta, { color: props.colors.textSecondary }]}>
              {props.project.sessions.length}{" "}
              {props.project.sessions.length === 1 ? "session" : "sessions"}
              {running ? ` · ${running} running` : ""}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel={`Create a session in ${props.project.name}`}
          accessibilityRole="button"
          onPress={() => props.onCreateSession(props.project)}
          style={styles.projectSessionAction}
        >
          <Text style={[styles.newSessionText, { color: props.colors.textSecondary }]}>+ Session</Text>
        </Pressable>
      </View>
      <View style={styles.sessions}>
          {props.project.sessions.length === 0 ? (
            <View style={styles.noSessions}>
              <Text
                style={[styles.meta, { color: props.colors.textSecondary }]}
              >
                No sessions in this project yet.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => props.onCreateSession(props.project)}
                style={styles.emptySessionAction}
              >
                <Text style={[styles.resumeText, { color: props.colors.text }]}>+ New session</Text>
              </Pressable>
            </View>
          ) : (
            props.project.sessions.map((session) => (
              <SessionCard
                actionPendingId={props.actionPendingId}
                colors={props.colors}
                key={session.id}
                onArchive={() => props.onArchiveSession(session)}
                onNewChat={() =>
                  props.onNewOpencodeChat(props.project, session)
                }
                onOpenChat={(chat) =>
                  props.onOpenOpencodeChat(props.project, session, chat)
                }
                onResume={() => props.onResumeSession(session)}
                onTerminate={() => props.onTerminateSession(session)}
                session={session}
              />
            ))
          )}
      </View>
    </View>
  );
}

export function WorkspaceSection(props: WorkspaceSectionProps) {
  return (
    <View
      style={[
        styles.container,
        props.activeTab === "projects" && styles.projectsContainer,
      ]}
    >
      <View style={styles.workspaceHeader}>
        <Text style={[styles.workspaceTitle, { color: props.colors.textSecondary }]}>
          {props.activeTab === "chats" ? "All chats" : "Your projects"}
        </Text>
        {props.activeTab === "projects" ? (
          <Pressable
            accessibilityLabel="Create project"
            accessibilityRole="button"
            onPress={props.onCreateProject}
            style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
          >
            <Text style={[styles.createProjectText, { color: props.colors.text }]}>+ Project</Text>
          </Pressable>
        ) : null}
      </View>
      {props.activeTab === "chats" ? (
        <ChatList {...props} />
      ) : props.projects.length === 0 ? (
        <EmptyState colors={props.colors} kind="projects" />
      ) : (
        <View style={styles.projectList}>
          {props.projects.map((project) => (
            <ProjectCard {...props} key={project.id} project={project} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: Spacing.six },
  projectsContainer: { marginTop: Spacing.two },
  workspaceHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: TouchTarget,
  },
  workspaceTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
  createButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    paddingLeft: Spacing.three,
  },
  createProjectText: { fontSize: 11, fontWeight: "600" },
  empty: {
    alignItems: "center",
    borderRadius: Radius.large,
    gap: Spacing.three,
    padding: Spacing.seven,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyProject: { alignItems: "flex-start", paddingHorizontal: 0 },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 300,
    textAlign: "center",
  },
  chatRow: { alignItems: "center", flexDirection: "row", minHeight: 72 },
  chatMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 72,
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  chatName: { fontSize: 15, fontWeight: "600" },
  flex: { flex: 1, minWidth: 0 },
  meta: { fontSize: 12, marginTop: 2 },
  iconAction: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  projectList: { gap: Spacing.seven },
  projectCard: { overflow: "hidden" },
  projectHeader: { alignItems: "center", flexDirection: "row", minHeight: 52 },
  projectMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minHeight: 52,
  },
  projectName: { fontSize: 14, fontWeight: "700" },
  projectSessionAction: {
    alignItems: "center",
    minHeight: TouchTarget,
    justifyContent: "center",
    paddingLeft: Spacing.three,
  },
  newSessionText: { fontSize: 11, fontWeight: "600" },
  sessions: {
    gap: Spacing.one,
    marginLeft: Spacing.four,
    paddingTop: Spacing.one,
  },
  noSessions: {
    alignItems: "flex-start",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  emptySessionAction: { justifyContent: "center", minHeight: 36 },
  sessionCard: { overflow: "hidden" },
  sessionRow: { alignItems: "center", flexDirection: "row", minHeight: 48 },
  sessionMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 48,
  },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  sessionName: { fontSize: 13, fontWeight: "600" },
  inlineActions: { alignItems: "center", flexDirection: "row" },
  resumeButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
  },
  resumeText: { fontSize: 12, fontWeight: "600" },
  quietAction: { alignItems: "center", minHeight: 36, justifyContent: "center", paddingHorizontal: Spacing.two },
  quietActionText: { fontSize: 10, fontWeight: "600" },
  opencodeList: {
    paddingBottom: Spacing.two,
    paddingLeft: Spacing.four,
  },
  opencodeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 36,
  },
  promptMarker: { fontSize: 14, fontWeight: "700", width: 10 },
  opencodeTitle: { flex: 1, fontSize: 13, fontWeight: "500" },
  newChatText: { flex: 1, fontSize: 13, fontWeight: "700" },
  chatLoadError: {
    fontSize: 12,
    lineHeight: 17,
    paddingVertical: Spacing.two,
  },
  pressed: { opacity: 0.55 },
});
