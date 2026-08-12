import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
} from "@repo/app-store";
import { SymbolView } from "expo-symbols";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ProjectChatTarget = {
  opencodeSessionId: string;
  projectId: string;
  projectSessionId: string;
};

export function ProjectChatSwitcherDrawer({
  current,
  onClose,
  onSelect,
  visible,
}: {
  current: ProjectChatTarget;
  onClose: () => void;
  onSelect: (target: ProjectChatTarget) => void;
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

  return (
    <Modal
      animationType="slide"
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
        <View
          accessibilityViewIsModal
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 16),
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
            <ThemedText style={styles.title}>Projects</ThemedText>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.close}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close" }}
                size={18}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {projects.map((project) => {
              const projectSessions = sessions.filter(
                (entry) => entry.session.project_id === project.id,
              );
              return (
                <View
                  key={project.id}
                  style={[
                    styles.project,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
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

                  {projectSessions.map((entry) => {
                    const session = entry.session;
                    const running = entry.state === "running";
                    const chats = chatsBySessionId[session.id] ?? [];
                    return (
                      <View key={session.id}>
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

                        {running ? (
                          chats.length ? (
                            <View style={styles.chats}>
                              {chats.map((chat) => {
                                const selected =
                                  current.projectSessionId === session.id &&
                                  current.opencodeSessionId === chat.id;
                                const busy =
                                  statuses[session.id]?.[chat.id]?.type !==
                                    "idle" &&
                                  Boolean(statuses[session.id]?.[chat.id]);
                                const isUnread =
                                  unread[session.id]?.[chat.id] === true;
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
                                        (selected || isUnread) &&
                                          styles.emphasized,
                                      ]}
                                      themeColor={
                                        selected || isUnread
                                          ? "text"
                                          : "textSecondary"
                                      }
                                    >
                                      {chat.title || "Untitled chat"}
                                    </ThemedText>
                                    {busy || isUnread ? (
                                      <View
                                        style={[
                                          styles.chatIndicator,
                                          {
                                            backgroundColor: busy
                                              ? "#f59e0b"
                                              : "#3b82f6",
                                          },
                                        ]}
                                      />
                                    ) : null}
                                  </Pressable>
                                );
                              })}
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
        </View>
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
  close: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  content: { paddingBottom: 48, paddingTop: 18 },
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
  header: { alignItems: "center", flexDirection: "row", paddingHorizontal: 4 },
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
