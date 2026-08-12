import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type HomeView = 'chats' | 'projects';
const supportsNativeGlass = isGlassEffectAPIAvailable();

export default function HomeScreen() {
  const theme = useTheme();
  const [activeView, setActiveView] = useState<HomeView>('chats');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Open sidebar"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.roundedControl, pressed && styles.pressed]}>
          <GlassView
            glassEffectStyle="regular"
            isInteractive
            style={[
              styles.menuButton,
              !supportsNativeGlass && {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                borderWidth: 1,
              },
            ]}>
            <View style={styles.menuIcon}>
              <View style={[styles.menuLine, { backgroundColor: theme.text }]} />
              <View style={[styles.menuLine, { backgroundColor: theme.text }]} />
              <View style={[styles.menuLine, { backgroundColor: theme.text }]} />
            </View>
          </GlassView>
        </Pressable>

        <GlassView
          accessibilityLabel="Home view"
          accessibilityRole="tablist"
          glassEffectStyle="regular"
          style={[
            styles.tabPill,
            !supportsNativeGlass && {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
              borderWidth: 1,
            },
          ]}>
          <TabButton
            active={activeView === 'chats'}
            label="Chats"
            onPress={() => setActiveView('chats')}
          />
          <TabButton
            active={activeView === 'projects'}
            label="Projects"
            onPress={() => setActiveView('projects')}
          />
        </GlassView>

        <View style={styles.headerSpacer} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
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
        active && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.tabLabel} themeColor={active ? 'text' : 'textSecondary'}>
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  roundedControl: {
    borderRadius: 22,
  },
  menuIcon: {
    gap: 4,
    width: 18,
  },
  menuLine: {
    borderRadius: 2,
    height: 2,
    width: 18,
  },
  tabPill: {
    borderRadius: 22,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 4,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    minWidth: 82,
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  headerSpacer: {
    width: 44,
  },
  pressed: {
    opacity: 0.72,
  },
});
