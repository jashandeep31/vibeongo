import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";

import type { OpencodeChatOption, OpencodeSessionStatus } from "./opencode-api";

export function OpencodeChatSwitcher({
  chats,
  chatStatuses,
  colors,
  currentId,
  onClose,
  onSelect,
  visible,
}: {
  chats: OpencodeChatOption[];
  chatStatuses: Record<string, OpencodeSessionStatus>;
  colors: AppColors;
  currentId: string;
  onClose: () => void;
  onSelect: (chat: OpencodeChatOption) => void;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.sheet, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>
              Session chats
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Swipe the title pill to move between them
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.close}
          >
            <AppIcon
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={18}
              tintColor={colors.textSecondary}
            />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {chats.map((chat) => {
            const selected = chat.id === currentId;
            const status = chatStatuses[chat.id]?.type ?? "idle";
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={chat.id}
                onPress={() => onSelect(chat)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: selected
                      ? colors.backgroundElement
                      : colors.surface,
                    borderColor: selected ? colors.brand : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowCopy}>
                  <Text
                    numberOfLines={1}
                    style={[styles.rowTitle, { color: colors.text }]}
                  >
                    {chat.title?.trim() || "Untitled chat"}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.directory, { color: colors.textSecondary }]}
                  >
                    {chat.directory?.split("/").filter(Boolean).at(-1) ??
                      "Repository"}
                    {status === "busy"
                      ? " · Working"
                      : status === "retry"
                        ? " · Retrying"
                        : ""}
                  </Text>
                </View>
                {status !== "idle" ? (
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          status === "busy" ? colors.brand : colors.warning,
                      },
                    ]}
                  />
                ) : null}
                {selected ? (
                  <AppIcon
                    name={{
                      ios: "checkmark.circle.fill",
                      android: "check_circle",
                      web: "check_circle",
                    }}
                    size={19}
                    tintColor={colors.brand}
                  />
                ) : null}
              </Pressable>
            );
          })}
          {chats.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              No chats found.
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
    paddingLeft: Spacing.four,
    paddingRight: Spacing.two,
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 17, fontWeight: "700" },
  subtitle: { fontSize: 11, marginTop: 2 },
  close: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  list: {
    gap: Spacing.two,
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
  },
  row: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13, fontWeight: "700" },
  directory: { fontSize: 10, marginTop: 3 },
  statusDot: {
    borderRadius: Radius.pill,
    height: 7,
    marginRight: Spacing.two,
    width: 7,
  },
  empty: { fontSize: 13, paddingVertical: Spacing.eight, textAlign: "center" },
  pressed: { opacity: 0.6 },
});
