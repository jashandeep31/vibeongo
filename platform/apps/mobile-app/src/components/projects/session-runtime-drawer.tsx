import { SymbolView } from "expo-symbols";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { useTheme } from "@/hooks/use-theme";

export type SessionRuntime = "vm" | "sandbox";

type SessionRuntimeDrawerProps = {
  onClose: () => void;
  onSelect: (runtime: SessionRuntime) => void;
  visible: boolean;
};

const runtimes = [
  {
    icon: { ios: "cloud", android: "cloud" } as const,
    title: "Virtual machine",
    value: "vm" as const,
  },
  {
    icon: { ios: "shippingbox", android: "deployed_code" } as const,
    title: "Sandbox",
    value: "sandbox" as const,
  },
];

export function SessionRuntimeDrawer({
  onClose,
  onSelect,
  visible,
}: SessionRuntimeDrawerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
          accessibilityLabel="Close runtime drawer"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <BottomDrawerPanel
          accessibilityViewIsModal
          visible={visible}
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 20),
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
            <View style={styles.headerCopy}>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Choose a runtime
              </ThemedText>
            </View>
          </View>

          <View style={styles.runtimes}>
            {runtimes.map((runtime, index) => (
              <Pressable
                accessibilityLabel={`Resume with ${runtime.title}`}
                accessibilityRole="button"
                key={runtime.value}
                onPress={() => onSelect(runtime.value)}
                style={({ pressed }) => [
                  styles.runtime,
                  index < runtimes.length - 1 && {
                    borderBottomColor: theme.backgroundSelected,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && {
                    backgroundColor: theme.backgroundElement,
                  },
                ]}
              >
                <View
                  style={[
                    styles.runtimeIcon,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <SymbolView
                    name={runtime.icon}
                    size={18}
                    tintColor={theme.text}
                  />
                </View>
                <ThemedText style={styles.runtimeTitle}>
                  {runtime.title}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    maxWidth: 620,
    paddingHorizontal: 20,
    position: "absolute",
    width: "100%",
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    marginTop: 8,
    width: 36,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
  },
  headerCopy: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  runtime: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 4,
  },
  runtimeIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  runtimes: {
    marginTop: 18,
  },
  runtimeTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
});
