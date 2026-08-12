import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { clearAccessToken } from "@/lib/auth";

type HomeSidebarProps = {
  visible: boolean;
  onClose: () => void;
};

const supportsNativeGlass = isGlassEffectAPIAvailable();

type NavigationItem = {
  title: string;
  icon: SymbolViewProps["name"];
};

const navigation: NavigationItem[] = [
  { title: "Home", icon: { ios: "house", android: "home" } },
  {
    title: "New Chat",
    icon: { ios: "square.and.pencil", android: "edit_square" },
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
  },
  {
    title: "Settings",
    icon: { ios: "gearshape", android: "settings" },
  },
];

export function HomeSidebar({ visible, onClose }: HomeSidebarProps) {
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.94, 420);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await clearAccessToken();
      closeSidebar();
    } catch {
      Alert.alert("Could not sign out", "Please try again.");
    } finally {
      setIsSigningOut(false);
    }
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
                  onPress={closeSidebar}
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
              accessibilityRole="button"
              disabled={isSigningOut}
              onPress={() => void signOut()}
              style={({ pressed }) => [
                styles.signOut,
                { borderColor: theme.backgroundSelected },
                (pressed || isSigningOut) && styles.pressed,
              ]}
            >
              {isSigningOut ? (
                <ActivityIndicator color="#ef4444" size="small" />
              ) : (
                <SymbolView
                  name={{
                    ios: "rectangle.portrait.and.arrow.right",
                    android: "logout",
                  }}
                  size={19}
                  tintColor="#ef4444"
                />
              )}
              <ThemedText style={styles.signOutLabel}>Sign out</ThemedText>
            </Pressable>

            <Pressable
              accessibilityLabel="Open user profile"
              accessibilityRole="button"
              onPress={closeSidebar}
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
              </View>
              <View style={styles.profileText}>
                <ThemedText style={styles.profileName}>Your profile</ThemedText>
                <ThemedText
                  style={styles.profileHandle}
                  themeColor="textSecondary"
                >
                  Account
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
  signOut: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 22,
  },
  signOutLabel: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
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
