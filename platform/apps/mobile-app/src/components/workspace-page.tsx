import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { ChatList } from "@/components/chats/chat-list";
import { HomeSidebar } from "@/components/home-sidebar";
import { PageChromeLayout } from "@/components/page-chrome";
import { ProjectList } from "@/components/projects/project-list";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

type WorkspaceView = "chats" | "projects";

const supportsNativeGlass = isGlassEffectAPIAvailable();
const PAGE_ANIMATION_DURATION = 180;

export function WorkspacePage() {
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const initialView: WorkspaceView = view === "chats" ? "chats" : "projects";
  const pagerRef = useAnimatedRef<Animated.ScrollView>();
  const activeViewRef = useRef<WorkspaceView>(initialView);
  const currentScrollX = useSharedValue(initialView === "chats" ? 0 : width);
  const animatedScrollX = useSharedValue(currentScrollX.value);
  const [activeView, setActiveView] = useState<WorkspaceView>(initialView);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useDerivedValue(() => {
    scrollTo(pagerRef, animatedScrollX.value, 0, false);
  });

  const scrollHandler = useAnimatedScrollHandler((event) => {
    currentScrollX.value = event.contentOffset.x;
  });

  const commitView = useCallback(
    (nextView: WorkspaceView) => {
      router.setParams({ view: nextView });
    },
    [router],
  );

  const selectView = useCallback(
    (nextView: WorkspaceView) => {
      activeViewRef.current = nextView;
      setActiveView(nextView);

      cancelAnimation(animatedScrollX);
      animatedScrollX.value = currentScrollX.value;
      animatedScrollX.value = withTiming(
        nextView === "chats" ? 0 : width,
        {
          duration: PAGE_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) scheduleOnRN(commitView, nextView);
        },
      );
    },
    [animatedScrollX, commitView, currentScrollX, width],
  );

  useEffect(() => {
    if (view !== "chats" && view !== "projects") return;
    if (view === activeViewRef.current) return;

    activeViewRef.current = view;
    setActiveView(view);
    cancelAnimation(animatedScrollX);
    animatedScrollX.value = view === "chats" ? 0 : width;
  }, [animatedScrollX, view, width]);

  useEffect(() => {
    cancelAnimation(animatedScrollX);
    animatedScrollX.value = activeViewRef.current === "chats" ? 0 : width;
  }, [animatedScrollX, width]);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
        style={styles.screen}
      >
        <PageChromeLayout
          top={
            <View style={styles.topBar}>
              <Pressable
                accessibilityLabel="Open sidebar"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setIsSidebarOpen(true)}
                style={({ pressed }) => [
                  styles.roundedControl,
                  pressed && styles.pressed,
                ]}
              >
                <GlassView
                  glassEffectStyle="regular"
                  isInteractive
                  style={[
                    styles.menuButton,
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
                    name={{ ios: "line.3.horizontal", android: "menu" }}
                    size={20}
                    tintColor={theme.text}
                  />
                </GlassView>
              </Pressable>

              <GlassView
                accessibilityLabel="Workspace view"
                accessibilityRole="tablist"
                glassEffectStyle="regular"
                style={[
                  styles.tabPill,
                  !supportsNativeGlass && {
                    backgroundColor: isDark ? "#242528" : "#F1F2F4",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(15,23,42,0.06)",
                    borderWidth: 1,
                    overflow: "visible",
                  },
                ]}
              >
                <TabButton
                  active={activeView === "chats"}
                  isDark={isDark}
                  label="Chats"
                  onPress={() => selectView("chats")}
                />
                <TabButton
                  active={activeView === "projects"}
                  isDark={isDark}
                  label="Projects"
                  onPress={() => selectView("projects")}
                />
              </GlassView>

              {activeView === "projects" ? (
                <Pressable
                  accessibilityLabel="New project"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.push("/projects/create")}
                  style={({ pressed }) => [
                    styles.roundedControl,
                    pressed && styles.pressed,
                  ]}
                >
                  <GlassView
                    glassEffectStyle="regular"
                    isInteractive
                    style={[
                      styles.menuButton,
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
                      name={{ ios: "plus", android: "add" }}
                      size={20}
                      tintColor={theme.text}
                    />
                  </GlassView>
                </Pressable>
              ) : (
                <View style={styles.headerSpacer} />
              )}
            </View>
          }
        >
          {({ topInset }) => (
            <View style={[styles.screen, { paddingTop: topInset }]}>
              <Animated.ScrollView
                contentOffset={{ x: initialView === "chats" ? 0 : width, y: 0 }}
                horizontal
                keyboardShouldPersistTaps="handled"
                onScroll={scrollHandler}
                ref={pagerRef}
                scrollEnabled={false}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
                style={styles.pager}
              >
                <View style={[styles.chatPage, { width }]}>
                  <ChatList />
                </View>
                <View style={[styles.page, { width }]}>
                  <ProjectList />
                </View>
              </Animated.ScrollView>
            </View>
          )}
        </PageChromeLayout>
      </KeyboardAvoidingView>

      <HomeSidebar
        onClose={() => setIsSidebarOpen(false)}
        onSelectWorkspaceView={selectView}
        visible={isSidebarOpen}
      />
    </SafeAreaView>
  );
}

function TabButton({
  active,
  isDark,
  label,
  onPress,
}: {
  active: boolean;
  isDark: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        active &&
          (supportsNativeGlass
            ? { backgroundColor: theme.backgroundSelected }
            : { backgroundColor: isDark ? "#3A3B40" : "#FFFFFF" }),
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        style={styles.tabLabel}
        themeColor={active ? "text" : "textSecondary"}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    width: 44,
  },
  roundedControl: {
    borderRadius: 22,
  },
  tabPill: {
    borderRadius: 22,
    flexDirection: "row",
    overflow: "hidden",
    padding: 4,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    minWidth: 82,
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  headerSpacer: {
    width: 44,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  chatPage: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  pageLabel: {
    fontSize: 16,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },
});
