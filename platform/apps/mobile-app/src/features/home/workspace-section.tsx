import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Radius, Spacing, TouchTarget, type AppColors } from "@/constants/theme";

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
  onChangeTab: (tab: WorkspaceTab) => void;
  onDeleteChat: (chat: RecentChat) => void;
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

function EmptyState({ colors, kind }: { colors: AppColors; kind: WorkspaceTab }) {
  const chats = kind === "chats";
  return (
    <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}> 
      <AppIcon
        name={
          chats
            ? { ios: "bubble.left.and.bubble.right", android: "chat", web: "chat" }
            : { ios: "folder.badge.plus", android: "create_new_folder", web: "create_new_folder" }
        }
        size={25}
        tintColor={colors.textSecondary}
      />
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

function ChatList(props: Pick<WorkspaceSectionProps, "chats" | "colors" | "deletingChatId" | "onDeleteChat">) {
  const router = useRouter();
  if (props.chats.length === 0) return <EmptyState colors={props.colors} kind="chats" />;

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
            style={({ pressed }) => [styles.chatMain, pressed && styles.pressed]}
          >
            <View style={[styles.rowIcon, { backgroundColor: props.colors.backgroundElement }]}> 
              <AppIcon
                name={{ ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }}
                size={18}
                tintColor={props.colors.textSecondary}
              />
            </View>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={[styles.chatName, { color: props.colors.text }]}> 
                {chat.name}
              </Text>
              <Text style={[styles.meta, { color: props.colors.textSecondary }]}>Recent conversation</Text>
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
              <ActivityIndicator color={props.colors.destructive} size="small" />
            ) : (
              <AppIcon
                name={{ ios: "ellipsis", android: "more_horiz", web: "more_horiz" }}
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
  const [expanded, setExpanded] = useState(state === "running");
  const [now, setNow] = useState(Date.now());
  const pending = actionPendingId === session.id;

  useEffect(() => {
    if (state !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state]);

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.backgroundElement }]}> 
      <View style={styles.sessionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: state === "running" && expanded }}
          disabled={state !== "running"}
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => [styles.sessionMain, pressed && styles.pressed]}
        >
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
            <Text numberOfLines={1} style={[styles.sessionName, { color: colors.text }]}> 
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
          {state === "running" ? (
            <AppIcon
              name={
                expanded
                  ? { ios: "chevron.up", android: "expand_less", web: "expand_less" }
                  : { ios: "chevron.down", android: "expand_more", web: "expand_more" }
              }
              size={17}
              tintColor={colors.textSecondary}
            />
          ) : null}
        </Pressable>

        {pending || state === "processing" ? (
          <View style={styles.iconAction}><ActivityIndicator color={colors.brand} size="small" /></View>
        ) : state === "stopped" ? (
          <View style={styles.inlineActions}>
            <Pressable
              accessibilityLabel={`Resume ${session.name}`}
              accessibilityRole="button"
              onPress={onResume}
              style={[styles.resumeButton, { borderColor: colors.border }]}
            >
              <AppIcon name={{ ios: "play.fill", android: "play_arrow", web: "play_arrow" }} size={14} tintColor={colors.text} />
              <Text style={[styles.resumeText, { color: colors.text }]}>Resume</Text>
            </Pressable>
            <Pressable accessibilityLabel={`Archive ${session.name}`} accessibilityRole="button" onPress={onArchive} style={styles.iconAction}>
              <AppIcon name={{ ios: "archivebox", android: "archive", web: "archive" }} size={18} tintColor={colors.textSecondary} />
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityLabel={`Terminate ${session.name}`} accessibilityRole="button" onPress={onTerminate} style={styles.iconAction}>
            <AppIcon name={{ ios: "stop.fill", android: "stop", web: "stop" }} size={18} tintColor={colors.destructive} />
          </Pressable>
        )}
      </View>

      {state === "running" && expanded ? (
        <View style={[styles.opencodeList, { borderTopColor: colors.border }]}> 
          {(session.runtime?.chats ?? []).map((chat) => (
            <Pressable key={chat.id} accessibilityRole="button" onPress={() => onOpenChat(chat)} style={({ pressed }) => [styles.opencodeRow, pressed && styles.pressed]}>
              <AppIcon name={{ ios: "bubble.left", android: "chat", web: "chat" }} size={16} tintColor={colors.textSecondary} />
              <Text numberOfLines={1} style={[styles.opencodeTitle, { color: colors.text }]}>{chat.title || "Untitled chat"}</Text>
              <AppIcon name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} size={15} tintColor={colors.textSecondary} />
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={onNewChat} style={({ pressed }) => [styles.opencodeRow, pressed && styles.pressed]}>
            <AppIcon name={{ ios: "plus", android: "add", web: "add" }} size={17} tintColor={colors.brand} />
            <Text style={[styles.newChatText, { color: colors.brand }]}>New chat</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ProjectCard(props: Pick<WorkspaceSectionProps, "colors" | "actionPendingId" | "onArchiveSession" | "onCreateSession" | "onNewOpencodeChat" | "onOpenOpencodeChat" | "onResumeSession" | "onTerminateSession"> & { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const running = props.project.sessions.filter((session) => session.runtime?.state === "running").length;

  return (
    <View style={[styles.projectCard, { backgroundColor: props.colors.surface, borderColor: props.colors.border }]}> 
      <View style={styles.projectHeader}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={({ pressed }) => [styles.projectMain, pressed && styles.pressed]}>
          <View style={[styles.rowIcon, { backgroundColor: props.colors.backgroundElement }]}> 
            <AppIcon name={{ ios: "folder.fill", android: "folder", web: "folder" }} size={20} tintColor={props.colors.brand} />
          </View>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.projectName, { color: props.colors.text }]}>{props.project.name}</Text>
            <Text style={[styles.meta, { color: props.colors.textSecondary }]}>
              {props.project.sessions.length} {props.project.sessions.length === 1 ? "session" : "sessions"}{running ? ` · ${running} running` : ""}
            </Text>
          </View>
          <AppIcon name={expanded ? { ios: "chevron.up", android: "expand_less", web: "expand_less" } : { ios: "chevron.down", android: "expand_more", web: "expand_more" }} size={18} tintColor={props.colors.textSecondary} />
        </Pressable>
        <Pressable accessibilityLabel={`Create a session in ${props.project.name}`} accessibilityRole="button" onPress={() => props.onCreateSession(props.project)} style={styles.iconAction}>
          <AppIcon name={{ ios: "plus", android: "add", web: "add" }} size={20} tintColor={props.colors.text} />
        </Pressable>
      </View>
      {expanded ? (
        <View style={[styles.sessions, { borderTopColor: props.colors.border }]}> 
          {props.project.sessions.length === 0 ? (
            <View style={styles.noSessions}>
              <Text style={[styles.meta, { color: props.colors.textSecondary }]}>No sessions in this project yet.</Text>
              <Pressable accessibilityRole="button" onPress={() => props.onCreateSession(props.project)} style={[styles.outlineButton, { borderColor: props.colors.border }]}> 
                <AppIcon name={{ ios: "plus", android: "add", web: "add" }} size={16} tintColor={props.colors.text} />
                <Text style={[styles.resumeText, { color: props.colors.text }]}>New session</Text>
              </Pressable>
            </View>
          ) : props.project.sessions.map((session) => (
            <SessionCard
              actionPendingId={props.actionPendingId}
              colors={props.colors}
              key={session.id}
              onArchive={() => props.onArchiveSession(session)}
              onNewChat={() => props.onNewOpencodeChat(props.project, session)}
              onOpenChat={(chat) => props.onOpenOpencodeChat(props.project, session, chat)}
              onResume={() => props.onResumeSession(session)}
              onTerminate={() => props.onTerminateSession(session)}
              session={session}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function WorkspaceSection(props: WorkspaceSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.workspaceHeader}>
        <View accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: props.colors.backgroundElement, borderColor: props.colors.border }]}> 
          {(["chats", "projects"] as const).map((tab) => {
            const selected = props.activeTab === tab;
            return (
              <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => props.onChangeTab(tab)} style={[styles.segment, selected && { backgroundColor: props.colors.primary }]}> 
                <AppIcon name={tab === "chats" ? { ios: "bubble.left.and.bubble.right", android: "chat", web: "chat" } : { ios: "folder", android: "folder", web: "folder" }} size={15} tintColor={selected ? props.colors.primaryForeground : props.colors.textSecondary} />
                <Text style={[styles.segmentText, { color: selected ? props.colors.primaryForeground : props.colors.textSecondary }]}>{tab === "chats" ? "Chats" : "Projects"}</Text>
              </Pressable>
            );
          })}
        </View>
        {props.activeTab === "projects" ? (
          <Pressable accessibilityRole="button" onPress={() => Alert.alert("Create project", "Project creation is not available on mobile yet.")} style={[styles.createButton, { backgroundColor: props.colors.primary }]}> 
            <AppIcon name={{ ios: "plus", android: "add", web: "add" }} size={16} tintColor={props.colors.primaryForeground} />
            <Text style={[styles.createText, { color: props.colors.primaryForeground }]}>Create</Text>
          </Pressable>
        ) : null}
      </View>
      {props.activeTab === "chats" ? (
        <ChatList {...props} />
      ) : props.projects.length === 0 ? (
        <EmptyState colors={props.colors} kind="projects" />
      ) : (
        <View style={styles.projectList}>
          {props.projects.map((project) => <ProjectCard {...props} key={project.id} project={project} />)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: Spacing.seven },
  workspaceHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.five },
  segmented: { borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: Radius.pill, flexDirection: "row", gap: 6, height: 34, paddingHorizontal: 13 },
  segmentText: { fontSize: 13, fontWeight: "600" },
  createButton: { alignItems: "center", borderRadius: Radius.pill, flexDirection: "row", gap: 5, height: 42, paddingHorizontal: 14 },
  createText: { fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", borderRadius: Radius.large, gap: Spacing.three, padding: Spacing.seven },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyCopy: { fontSize: 13, lineHeight: 19, maxWidth: 300, textAlign: "center" },
  chatRow: { alignItems: "center", flexDirection: "row", minHeight: 72 },
  chatMain: { alignItems: "center", flex: 1, flexDirection: "row", gap: Spacing.three, minHeight: 72 },
  rowIcon: { alignItems: "center", borderRadius: Radius.medium, height: 42, justifyContent: "center", width: 42 },
  chatName: { fontSize: 15, fontWeight: "600" },
  flex: { flex: 1, minWidth: 0 },
  meta: { fontSize: 12, marginTop: 2 },
  iconAction: { alignItems: "center", height: TouchTarget, justifyContent: "center", width: TouchTarget },
  projectList: { gap: Spacing.three },
  projectCard: { borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  projectHeader: { alignItems: "center", flexDirection: "row", minHeight: 74 },
  projectMain: { alignItems: "center", flex: 1, flexDirection: "row", gap: Spacing.three, minHeight: 74, paddingLeft: Spacing.four },
  projectName: { fontSize: 15, fontWeight: "700" },
  sessions: { borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.two, padding: Spacing.three },
  noSessions: { alignItems: "center", gap: Spacing.three, padding: Spacing.five },
  outlineButton: { alignItems: "center", borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 5, height: 40, paddingHorizontal: 14 },
  sessionCard: { borderRadius: Radius.medium, overflow: "hidden" },
  sessionRow: { alignItems: "center", flexDirection: "row", minHeight: 58 },
  sessionMain: { alignItems: "center", flex: 1, flexDirection: "row", gap: Spacing.three, minHeight: 58, paddingLeft: Spacing.three },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  sessionName: { fontSize: 13, fontWeight: "600" },
  inlineActions: { alignItems: "center", flexDirection: "row" },
  resumeButton: { alignItems: "center", borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 4, height: 36, paddingHorizontal: 10 },
  resumeText: { fontSize: 12, fontWeight: "600" },
  opencodeList: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  opencodeRow: { alignItems: "center", flexDirection: "row", gap: Spacing.three, minHeight: TouchTarget },
  opencodeTitle: { flex: 1, fontSize: 13, fontWeight: "500" },
  newChatText: { flex: 1, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.55 },
});
