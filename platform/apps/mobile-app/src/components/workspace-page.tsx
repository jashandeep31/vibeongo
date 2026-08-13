import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatList } from "@/components/chats/chat-list";
import { HomeSidebar } from "@/components/home-sidebar";
import { ProjectList } from "@/components/projects/project-list";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

type WorkspaceView = "chats" | "projects";

const supportsNativeGlass = isGlassEffectAPIAvailable();

export function WorkspacePage() {
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("projects");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const selectView = (view: WorkspaceView) => {
    setActiveView(view);
    pagerRef.current?.scrollTo({
      animated: true,
      x: view === "chats" ? 0 : width,
    });
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
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

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        bounces={false}
        contentOffset={{ x: width, y: 0 }}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / width);
          setActiveView(page === 0 ? "chats" : "projects");
        }}
        pagingEnabled
        ref={pagerRef}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        <View style={[styles.page, { width }]}>
          <ChatList limit={5} />
        </View>
        <View style={[styles.page, { width }]}>
          <ProjectList />
        </View>
      </ScrollView>

      <HomeSidebar
        onClose={() => setIsSidebarOpen(false)}
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
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  pageLabel: {
    fontSize: 16,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },
});
