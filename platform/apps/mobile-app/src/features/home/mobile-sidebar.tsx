import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";

import type { WorkspaceTab } from "./workspace-section";

type MobileSidebarProps = {
  colors: AppColors;
  onClose: () => void;
  onSelectWorkspace: (tab: WorkspaceTab) => void;
  visible: boolean;
};

const navigation = [
  {
    label: "Home",
    icon: { ios: "house", android: "home", web: "home" } as const,
  },
  {
    label: "New Chat",
    icon: {
      ios: "square.and.pencil",
      android: "edit_square",
      web: "edit_square",
    } as const,
  },
  {
    label: "Limits",
    icon: {
      ios: "gauge.with.dots.needle.33percent",
      android: "speed",
      web: "speed",
    } as const,
  },
  {
    label: "GitHub Repos",
    icon: { ios: "chevron.left.forwardslash.chevron.right", android: "code", web: "code" } as const,
  },
  {
    label: "Wallet",
    icon: {
      ios: "wallet.bifold",
      android: "account_balance_wallet",
      web: "account_balance_wallet",
    } as const,
  },
  {
    label: "Settings",
    icon: { ios: "gearshape", android: "settings", web: "settings" } as const,
  },
];

export function MobileSidebar({
  colors,
  onClose,
  onSelectWorkspace,
  visible,
}: MobileSidebarProps) {
  const { signOut } = useAuth();

  const selectNavigation = (label: string) => {
    if (label === "Home" || label === "New Chat") {
      onSelectWorkspace("chats");
      onClose();
      return;
    }

    Alert.alert(label, `${label} is included in the next mobile implementation phase.`);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close navigation"
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        />
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[
            styles.sidebar,
            { backgroundColor: colors.surface, borderRightColor: colors.border },
          ]}
        >
          <View style={styles.sidebarHeader}>
            <Text style={[styles.sidebarTitle, { color: colors.text }]}>AI Playground</Text>
            <Pressable
              accessibilityLabel="Close navigation"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <AppIcon
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={20}
                tintColor={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.navigation}>
            {navigation.map((item, index) => {
              const active = index === 0;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={item.label}
                  onPress={() => selectNavigation(item.label)}
                  style={({ pressed }) => [
                    styles.navigationRow,
                    active && { backgroundColor: colors.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                >
                  <AppIcon
                    name={item.icon}
                    size={19}
                    tintColor={active ? colors.text : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.navigationText,
                      { color: active ? colors.text : colors.textSecondary },
                      active && styles.navigationTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>WORKSPACE</Text>
          <View style={styles.workspaceNavigation}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSelectWorkspace("chats");
                onClose();
              }}
              style={({ pressed }) => [styles.navigationRow, pressed && styles.pressed]}
            >
              <AppIcon
                name={{ ios: "bubble.left.and.bubble.right", android: "chat", web: "chat" }}
                size={19}
                tintColor={colors.textSecondary}
              />
              <Text style={[styles.navigationText, { color: colors.textSecondary }]}>Chats</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSelectWorkspace("projects");
                onClose();
              }}
              style={({ pressed }) => [styles.navigationRow, pressed && styles.pressed]}
            >
              <AppIcon
                name={{ ios: "folder", android: "folder", web: "folder" }}
                size={19}
                tintColor={colors.textSecondary}
              />
              <Text style={[styles.navigationText, { color: colors.textSecondary }]}>Projects</Text>
            </Pressable>
          </View>

          <View style={styles.sidebarFooter}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                void signOut();
              }}
              style={({ pressed }) => [styles.navigationRow, pressed && styles.pressed]}
            >
              <AppIcon
                name={{ ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" }}
                size={19}
                tintColor={colors.destructive}
              />
              <Text style={[styles.navigationText, { color: colors.destructive }]}>Sign out</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, flexDirection: "row" },
  backdrop: { ...StyleSheet.absoluteFill },
  sidebar: {
    borderRightWidth: StyleSheet.hairlineWidth,
    elevation: 18,
    maxWidth: 320,
    shadowColor: "#000000",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    width: "82%",
  },
  sidebarHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 64,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.five,
  },
  sidebarTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.4 },
  iconButton: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  navigation: { gap: 3, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  navigationRow: {
    alignItems: "center",
    borderRadius: Radius.medium,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
  },
  navigationText: { fontSize: 14, fontWeight: "500" },
  navigationTextActive: { fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.four },
  groupLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: Spacing.two, marginHorizontal: Spacing.six, marginTop: Spacing.five },
  workspaceNavigation: { gap: 3, paddingHorizontal: Spacing.three },
  sidebarFooter: { marginTop: "auto", paddingBottom: Spacing.two, paddingTop: Spacing.four },
  pressed: { opacity: 0.55 },
});
