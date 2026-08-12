import { useGetVibeongoChats } from "@repo/api-hooks";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function ChatList({ limit = 5 }: { limit?: number }) {
  const theme = useTheme();
  const { data: chats = [], isPending, isError } = useGetVibeongoChats(limit);

  if (isPending) {
    return <ActivityIndicator />;
  }

  if (isError) {
    return (
      <ThemedText style={styles.message} themeColor="textSecondary">
        Could not load chats.
      </ThemedText>
    );
  }

  if (chats.length === 0) {
    return (
      <ThemedText style={styles.message} themeColor="textSecondary">
        No chats yet.
      </ThemedText>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
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
