import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserMetadata } from "@repo/api-hooks";

import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

type HomeSidebarProps = {
  visible: boolean;
  onClose: () => void;
};

const supportsNativeGlass = isGlassEffectAPIAvailable();

type NavigationItem = {
  title: string;
  icon: SymbolViewProps["name"];
  href?: "/" | "/settings" | "/wallet";
  workspaceView?: "chats" | "projects";
};

const navigation: NavigationItem[] = [
  { title: "Home", icon: { ios: "house", android: "home" }, href: "/" },
  {
    title: "New Chat",
    icon: { ios: "square.and.pencil", android: "edit_square" },
    workspaceView: "chats",
  },
  {
    title: "Limits",
    icon: { ios: "gauge.with.dots.needle.50percent", android: "speed" },
  },
  {
    title: "GitHub Repos",
    icon: { ios: "chevron.left.forwardslash.chevron.right", android: "code" },
  },
  {
    title: "Wallet",
    icon: { ios: "wallet.bifold", android: "account_balance_wallet" },
    href: "/wallet",
  },
  {
    title: "Settings",
    icon: { ios: "gearshape", android: "settings" },
    href: "/settings",
  },
];

export function HomeSidebar({ visible, onClose }: HomeSidebarProps) {
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const userQuery = useUserMetadata();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.94, 420);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    translateX.setValue(-drawerWidth);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateX, {
        damping: 22,
        mass: 0.8,
        stiffness: 230,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, drawerWidth, translateX, visible]);

  const closeSidebar = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        duration: 180,
        toValue: -drawerWidth,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        duration: 160,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [backdropOpacity, drawerWidth, onClose, translateX]);

  const user = userQuery.data;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const profileName =
    fullName ||
    user?.username ||
    (userQuery.isPending ? "Loading profile..." : "Profile unavailable");
  const profileHandle = user?.username ? `@${user.username}` : "Account";

  const openProfile = () => {
    router.navigate("/profile");
    closeSidebar();
  };

  const selectNavigationItem = (item: NavigationItem) => {
    if (item.workspaceView) {
      router.navigate({ pathname: "/", params: { view: item.workspaceView } });
    } else if (item.href) {
      router.navigate(item.href);
    }
    closeSidebar();
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={closeSidebar}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityLabel="Close sidebar"
            accessibilityRole="button"
            onPress={closeSidebar}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sidebar,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              transform: [{ translateX }],
              width: drawerWidth,
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <ThemedText style={styles.brand}>VibeOnGo</ThemedText>
              <Pressable
                accessibilityLabel="Close sidebar"
                accessibilityRole="button"
                hitSlop={8}
                onPress={closeSidebar}
                style={({ pressed }) => [
                  styles.closeControl,
                  pressed && styles.pressed,
                ]}
              >
                <GlassView
                  glassEffectStyle="regular"
                  isInteractive
                  style={[
                    styles.closeButton,
                    !supportsNativeGlass && {
                      backgroundColor: isDark ? "#242528" : "#FFFFFF",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(15,23,42,0.08)",
                      borderWidth: 1,
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: "xmark", android: "close" }}
                    size={17}
                    tintColor={theme.text}
                    weight="medium"
                  />
                </GlassView>
              </Pressable>
            </View>

            <View accessibilityRole="menu" style={styles.navigation}>
              {navigation.map((item) => (
                <Pressable
                  accessibilityRole="menuitem"
                  key={item.title}
                  onPress={() => selectNavigationItem(item)}
                  style={({ pressed }) => [
                    styles.navigationItem,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={item.icon}
                    size={20}
                    tintColor={theme.text}
                  />
                  <ThemedText style={styles.navigationLabel}>
                    {item.title}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.spacer} />

            <Pressable
              accessibilityLabel="Open user profile"
              accessibilityRole="button"
              onPress={openProfile}
              style={({ pressed }) => [
                styles.profile,
                { borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <SymbolView
                  name={{ ios: "person.fill", android: "person" }}
                  size={20}
                  tintColor={theme.textSecondary}
                />
                {user?.username ? (
                  <Image
                    accessibilityLabel={`${profileName} profile picture`}
                    contentFit="cover"
                    source={`https://github.com/${user.username}.png`}
                    style={styles.avatarImage}
                    transition={120}
                  />
                ) : null}
              </View>
              <View style={styles.profileText}>
                <ThemedText numberOfLines={1} style={styles.profileName}>
                  {profileName}
                </ThemedText>
                <ThemedText
                  numberOfLines={1}
                  style={styles.profileHandle}
                  themeColor="textSecondary"
                >
                  {profileHandle}
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={16}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sidebar: {
    borderRightWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 18,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  closeControl: {
    borderRadius: 22,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    width: 44,
  },
  navigation: {
    paddingHorizontal: 12,
  },
  navigationItem: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 14,
    minHeight: 46,
    paddingHorizontal: 10,
  },
  navigationLabel: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  spacer: {
    flex: 1,
  },
  profile: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 22,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42,
  },
  avatarImage: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 19,
  },
  profileHandle: {
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.68,
  },
});
