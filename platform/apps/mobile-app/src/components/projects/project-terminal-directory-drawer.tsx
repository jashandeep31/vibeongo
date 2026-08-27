import type { TerminalFavoriteDir } from "@repo/app-store";
import { SymbolView } from "expo-symbols";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function ProjectTerminalDirectoryDrawer({
  dirs,
  disabled,
  onClose,
  onSelect,
  visible,
}: {
  dirs: TerminalFavoriteDir[];
  disabled: boolean;
  onClose: () => void;
  onSelect: (workingDirectory?: string) => void;
  visible: boolean;
}) {
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
          accessibilityLabel="Close directory picker"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <BottomDrawerPanel
          accessibilityViewIsModal
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          visible={visible}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.title}>
                Choose a terminal directory
              </ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                The new terminal will start in this directory.
              </ThemedText>
            </View>
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
            {dirs.length === 0 ? (
              <DirectoryRow
                disabled={disabled}
                name="Home"
                onPress={() => onSelect()}
                path="Default runtime home directory"
              />
            ) : (
              dirs.map((dir) => (
                <DirectoryRow
                  disabled={disabled}
                  key={dir.path}
                  name={dir.name}
                  onPress={() => onSelect(dir.path)}
                  path={dir.path}
                />
              ))
            )}
          </ScrollView>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

function DirectoryRow({
  disabled,
  name,
  onPress,
  path,
}: {
  disabled: boolean;
  name: string;
  onPress: () => void;
  path: string;
}) {
  const theme = useTheme();
  const isHome = name === "Home";

  return (
    <Pressable
      accessibilityLabel={`Open terminal in ${name}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.directory,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[styles.iconTile, { backgroundColor: theme.backgroundSelected }]}
      >
        <SymbolView
          name={{
            ios: isHome ? "house" : "folder",
            android: isHome ? "home" : "folder",
          }}
          size={18}
          tintColor={theme.text}
        />
      </View>
      <View style={styles.rowCopy}>
        <ThemedText style={styles.rowTitle}>{name}</ThemedText>
        <ThemedText
          numberOfLines={1}
          style={styles.path}
          themeColor="textSecondary"
        >
          {path}
        </ThemedText>
      </View>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right" }}
        size={17}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.46)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  close: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  content: { gap: 8, paddingBottom: 36, paddingTop: 18 },
  directory: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 12,
  },
  disabled: { opacity: 0.5 },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    height: "68%",
    maxWidth: 680,
    paddingHorizontal: 16,
    position: "absolute",
    width: "100%",
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
  headerCopy: { flex: 1 },
  iconTile: {
    alignItems: "center",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  path: { fontFamily: Fonts.mono, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.66 },
  root: { flex: 1, justifyContent: "flex-end" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  title: { fontSize: 18, fontWeight: "700" },
});
