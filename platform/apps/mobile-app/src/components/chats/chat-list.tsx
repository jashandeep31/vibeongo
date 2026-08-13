import { useGetVibeongoChats, useWebSocket } from "@repo/api-hooks";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function ChatList({ limit = 5 }: { limit?: number }) {
  const theme = useTheme();
  const { data: chats = [], isPending, isError } = useGetVibeongoChats(limit);
  const { isConnected } = useWebSocket();

  return (
    <View style={styles.container}>
      {isConnected ? (
        <View accessibilityLiveRegion="polite" style={styles.connectionSuccess}>
          <View style={styles.connectionDot} />
          <ThemedText style={styles.connectionText}>
            Connected successfully
          </ThemedText>
        </View>
      ) : null}

      {isPending ? <ActivityIndicator /> : null}

      {isError ? (
        <ThemedText style={styles.message} themeColor="textSecondary">
          Could not load chats.
        </ThemedText>
      ) : null}

      {!isPending && !isError && chats.length === 0 ? (
        <ThemedText style={styles.message} themeColor="textSecondary">
          No chats yet.
        </ThemedText>
      ) : null}

      {!isPending && !isError && chats.length > 0 ? (
        <View style={styles.list}>
          {chats.map((chat) => (
            <View
              key={chat.id}
              style={[styles.row, { borderColor: theme.backgroundSelected }]}
            >
              <ThemedText numberOfLines={1} style={styles.name}>
                {chat.name}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  connectionDot: {
    backgroundColor: "#16A34A",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  connectionSuccess: {
    alignItems: "center",
    backgroundColor: "rgba(22, 163, 74, 0.12)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  connectionText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    gap: 20,
    width: "100%",
  },
  list: {
    gap: 10,
    width: "100%",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
  },
  name: {
    fontSize: 16,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
});
