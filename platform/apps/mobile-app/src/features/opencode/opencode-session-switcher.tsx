import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import {
  getOpencodeProjectSessions,
  type OpencodeProjectSessionOption,
} from "./opencode-api";

export function OpencodeSessionSwitcher({
  colors,
  currentId,
  onClose,
  onSelect,
  projectId,
  visible,
}: {
  colors: AppColors;
  currentId: string;
  onClose: () => void;
  onSelect: (session: OpencodeProjectSessionOption) => void;
  projectId?: string;
  visible: boolean;
}) {
  const [sessions, setSessions] = useState<OpencodeProjectSessionOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !projectId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getOpencodeProjectSessions(projectId)
      .then((next) => {
        if (!cancelled) setSessions(next);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load project sessions.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, visible]);

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
            <Text style={[styles.title, { color: colors.text }]}>Sessions</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose a project session
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
        {isLoading ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : error ? (
          <Text style={[styles.statusText, { color: colors.destructive }]}>
            {error}
          </Text>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {sessions.map((session) => {
              const selected = session.id === currentId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !session.running, selected }}
                  disabled={!session.running}
                  key={session.id}
                  onPress={() => onSelect(session)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: selected
                        ? colors.backgroundElement
                        : colors.surface,
                      borderColor: selected ? colors.brand : colors.border,
                    },
                    !session.running && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.rowCopy}>
                    <Text
                      numberOfLines={1}
                      style={[styles.rowTitle, { color: colors.text }]}
                    >
                      {session.name}
                    </Text>
                    <Text
                      style={[styles.runtime, { color: colors.textSecondary }]}
                    >
                      {session.running ? "Running" : "Stopped"}
                    </Text>
                  </View>
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
            {sessions.length === 0 ? (
              <Text
                style={[styles.statusText, { color: colors.textSecondary }]}
              >
                No sessions found.
              </Text>
            ) : null}
          </ScrollView>
        )}
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
  runtime: { fontSize: 10, marginTop: 3 },
  status: { alignItems: "center", flex: 1, justifyContent: "center" },
  statusText: { fontSize: 13, padding: Spacing.eight, textAlign: "center" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.6 },
});
