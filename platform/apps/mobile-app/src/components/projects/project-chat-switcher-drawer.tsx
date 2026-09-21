import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
} from "@repo/app-store";
import { SymbolView } from "expo-symbols";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ProjectChatTarget = {
  opencodeSessionId: string;
  projectId: string;
  projectSessionId: string;
};

export type NewProjectChatTarget = {
  directory: string;
  projectId: string;
  projectSessionId: string;
};

export function ProjectChatSwitcherDrawer({
  current,
  newChatDirectoriesBySessionId,
  onClose,
  onDelete,
  onNewChat,
  onSelect,
  scopeProjectSessionId,
  visible,
}: {
  current?: ProjectChatTarget;
  newChatDirectoriesBySessionId?: Record<string, string | undefined>;
  onClose: () => void;
  onDelete?: (target: ProjectChatTarget) => void;
  onNewChat: (target: NewProjectChatTarget) => void;
  onSelect: (target: ProjectChatTarget) => void;
  scopeProjectSessionId?: string;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const projects = useProjectsStore((store) => store.projects);
  const sessions = useSessionsStore((store) => store.sessions);
  const chatsBySessionId = useSessionChatsStore(
    (store) => store.chatsBySessionId,
  );
  const statuses = useSessionChatsStore((store) => store.statusesBySessionId);
  const unread = useSessionChatsStore((store) => store.unreadBySessionId);
  const attention = useSessionChatsStore((store) => store.attentionBySessionId);
  const scopedSession = scopeProjectSessionId
    ? sessions.find((entry) => entry.session.id === scopeProjectSessionId)
    : undefined;
  const scopedProject = scopedSession
    ? projects.find(
        (project) => project.id === scopedSession.session.project_id,
      )
    : undefined;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close chat switcher"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <BottomDrawerPanel
          accessibilityViewIsModal
          visible={visible}
          style={[
            styles.drawer,
            scopeProjectSessionId && styles.compactDrawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: scopeProjectSessionId
                ? Math.max(insets.bottom, 8)
                : Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              {scopeProjectSessionId
                ? `${scopedProject?.name ?? "Project"} | ${scopedSession?.session.name ?? "Session"}`
                : "Projects"}
            </ThemedText>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              scopeProjectSessionId && styles.compactContent,
            ]}
            showsVerticalScrollIndicator={false}
            style={scopeProjectSessionId ? styles.compactScroll : undefined}
          >
            {projects.map((project) => {
              const projectSessions = sessions.filter(
                (entry) =>
                  entry.session.project_id === project.id &&
                  (!scopeProjectSessionId ||
                    entry.session.id === scopeProjectSessionId),
              );
              if (scopeProjectSessionId && projectSessions.length === 0) {
                return null;
              }
              return (
                <View
                  key={project.id}
                  style={[
                    styles.project,
                    scopeProjectSessionId && styles.compactProject,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
                  {!scopeProjectSessionId ? (
                    <View style={styles.projectHeader}>
                      <SymbolView
                        name={{ ios: "folder", android: "folder" }}
                        size={16}
                        tintColor={theme.textSecondary}
                      />
                      <ThemedText numberOfLines={1} style={styles.projectName}>
                        {project.name}
                      </ThemedText>
                    </View>
                  ) : null}

                  {projectSessions.map((entry) => {
                    const session = entry.session;
                    const running = entry.state === "running";
                    const chats = chatsBySessionId[session.id] ?? [];
                    const newChatDirectory =
                      chats[0]?.directory ??
                      newChatDirectoriesBySessionId?.[session.id];
                    return (
                      <View key={session.id}>
                        {!scopeProjectSessionId ? (
                          <View style={styles.sessionRow}>
                            <SymbolView
                              name={{
                                ios: running ? "chevron.down" : "chevron.right",
                                android: running
                                  ? "keyboard_arrow_down"
                                  : "chevron_right",
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
                              accessibilityLabel={
                                running
                                  ? "Running"
                                  : entry.state === "processing"
                                    ? "Starting"
                                    : "Stopped"
                              }
                              style={[
                                styles.statusDot,
                                {
                                  backgroundColor: running
                                    ? "#10b981"
                                    : entry.state === "processing"
                                      ? "#f59e0b"
                                      : theme.textSecondary,
                                  opacity: entry.state === "stopped" ? 0.45 : 1,
                                },
                              ]}
                            />
                          </View>
                        ) : null}

                        {running ? (
                          chats.length || newChatDirectory ? (
                            <View
                              style={[
                                styles.chats,
                                scopeProjectSessionId && styles.compactChats,
                              ]}
                            >
                              {chats.map((chat) => {
                                const selected =
                                  current?.projectSessionId === session.id &&
                                  current?.opencodeSessionId === chat.id;
                                const busy =
                                  statuses[session.id]?.[chat.id]?.type !==
                                    "idle" &&
                                  Boolean(statuses[session.id]?.[chat.id]);
                                const isUnread =
                                  unread[session.id]?.[chat.id] === true;
                                const needsAttention =
                                  attention[session.id]?.[chat.id] === true;
                                const stateLabel = needsAttention
                                  ? "Needs attention"
                                  : busy
                                    ? "Working"
                                    : isUnread
                                      ? "New answer"
                                      : undefined;
                                return (
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                    key={chat.id}
                                    onPress={() =>
                                      onSelect({
                                        opencodeSessionId: chat.id,
                                        projectId: project.id,
                                        projectSessionId: session.id,
                                      })
                                    }
                                    style={({ pressed }) => [
                                      styles.chat,
                                      selected && {
                                        backgroundColor:
                                          theme.backgroundElement,
                                      },
                                      pressed && {
                                        backgroundColor:
                                          theme.backgroundElement,
                                      },
                                    ]}
                                  >
                                    <SymbolView
                                      name={{
                                        ios: "bubble.left",
                                        android: "chat_bubble_outline",
                                      }}
                                      size={14}
                                      tintColor={theme.textSecondary}
                                    />
                                    <ThemedText
                                      numberOfLines={1}
                                      style={[
                                        styles.chatTitle,
                                        (selected ||
                                          isUnread ||
                                          needsAttention) &&
                                          styles.emphasized,
                                      ]}
                                      themeColor={
                                        selected || isUnread || needsAttention
                                          ? "text"
                                          : "textSecondary"
                                      }
                                    >
                                      {chat.title || "Untitled chat"}
                                    </ThemedText>
                                    {stateLabel ? (
                                      <View
                                        accessibilityLabel={stateLabel}
                                        style={[
                                          styles.chatIndicator,
                                          {
                                            backgroundColor: needsAttention
                                              ? "#ef4444"
                                              : busy
                                                ? "#f59e0b"
                                                : "#3b82f6",
                                          },
                                        ]}
                                      />
                                    ) : null}
                                    {selected ? (
                                      <SymbolView
                                        name={{
                                          ios: "checkmark.circle.fill",
                                          android: "check_circle",
                                        }}
                                        size={17}
                                        tintColor={theme.text}
                                      />
                                    ) : null}
                                    {onDelete ? (
                                      <Pressable
                                        accessibilityLabel={`Delete ${chat.title || "chat"}`}
                                        accessibilityRole="button"
                                        hitSlop={8}
                                        onPress={(event) => {
                                          event.stopPropagation();
                                          onDelete({
                                            opencodeSessionId: chat.id,
                                            projectId: project.id,
                                            projectSessionId: session.id,
                                          });
                                        }}
                                        style={styles.delete}
                                      >
                                        <SymbolView
                                          name={{
                                            ios: "trash",
                                            android: "delete",
                                          }}
                                          size={16}
                                          tintColor="#ef4444"
                                        />
                                      </Pressable>
                                    ) : null}
                                  </Pressable>
                                );
                              })}
                              {newChatDirectory ? (
                                <Pressable
                                  accessibilityLabel={`New chat in ${session.name}`}
                                  accessibilityRole="button"
                                  onPress={() =>
                                    onNewChat({
                                      directory: newChatDirectory,
                                      projectId: project.id,
                                      projectSessionId: session.id,
                                    })
                                  }
                                  style={({ pressed }) => [
                                    styles.chat,
                                    pressed && {
                                      backgroundColor: theme.backgroundElement,
                                    },
                                  ]}
                                >
                                  <SymbolView
                                    name={{ ios: "plus", android: "add" }}
                                    size={15}
                                    tintColor={theme.textSecondary}
                                  />
                                  <ThemedText
                                    style={styles.chatTitle}
                                    themeColor="textSecondary"
                                  >
                                    New chat
                                  </ThemedText>
                                </Pressable>
                              ) : null}
                            </View>
                          ) : (
                            <ThemedText
                              style={styles.empty}
                              themeColor="textSecondary"
                            >
                              No chats yet.
                            </ThemedText>
                          )
                        ) : null}
                      </View>
                    );
                  })}
                  {projectSessions.length === 0 ? (
                    <ThemedText style={styles.empty} themeColor="textSecondary">
                      This project does not have any sessions yet.
                    </ThemedText>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  chat: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    minHeight: 36,
    paddingHorizontal: 8,
  },
  chatIndicator: { borderRadius: 4, height: 7, width: 7 },
  chats: { marginBottom: 6, paddingLeft: 24 },
  chatTitle: { flex: 1, fontSize: 13 },
  delete: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  content: { paddingBottom: 48, paddingTop: 18 },
  compactChats: { marginBottom: 0, paddingLeft: 0 },
  compactContent: { paddingBottom: 4, paddingTop: 8 },
  compactDrawer: { height: undefined, maxHeight: "60%" },
  compactProject: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  compactScroll: { flexGrow: 0 },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    height: "82%",
    maxWidth: 680,
    paddingHorizontal: 16,
    position: "absolute",
    width: "100%",
  },
  emphasized: { fontWeight: "700" },
  empty: {
    fontSize: 14,
    lineHeight: 22,
    paddingBottom: 8,
    paddingLeft: 26,
    paddingTop: 14,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 12,
    marginTop: 8,
    width: 36,
  },
  header: { paddingHorizontal: 4 },
  pressed: { opacity: 0.58 },
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
  root: { flex: 1, justifyContent: "flex-end" },
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
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  title: { fontSize: 18, fontWeight: "700" },
});
