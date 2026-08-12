import type { ProjectGithubRepo } from "@repo/api-client";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type RepositoryDrawerProps = {
  error: boolean;
  loading: boolean;
  onClose: () => void;
  onSelect: (directory: string) => void;
  repositories: ProjectGithubRepo[];
  visible: boolean;
};

function getRepositoryDirectory(fullName: string) {
  const name = fullName.split("/").filter(Boolean).at(-1) ?? fullName;
  return `/home/ubuntu/code/${name}`;
}

export function RepositoryDrawer({
  error,
  loading,
  onClose,
  onSelect,
  repositories,
  visible,
}: RepositoryDrawerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close repository drawer"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          accessibilityViewIsModal
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
              <ThemedText style={styles.title}>Choose repository</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                The new chat will start in this directory.
              </ThemedText>
            </View>
          </View>

          <View style={styles.list}>
            {loading ? <ActivityIndicator style={styles.state} /> : null}
            {error ? (
              <ThemedText style={styles.state} themeColor="textSecondary">
                Could not load connected repositories.
              </ThemedText>
            ) : null}
            {!loading && !error && repositories.length === 0 ? (
              <ThemedText style={styles.state} themeColor="textSecondary">
                No GitHub repositories are connected to this project.
              </ThemedText>
            ) : null}
            {repositories.map((repository) => {
              const directory = getRepositoryDirectory(repository.full_name);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={repository.id}
                  onPress={() => onSelect(directory)}
                  style={({ pressed }) => [
                    styles.repository,
                    { borderColor: theme.backgroundSelected },
                    pressed && { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <View
                    style={[
                      styles.repositoryIcon,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: "folder", android: "folder" }}
                      size={17}
                      tintColor={theme.text}
                    />
                  </View>
                  <View style={styles.repositoryCopy}>
                    <ThemedText numberOfLines={1} style={styles.repositoryName}>
                      {repository.full_name}
                    </ThemedText>
                    <ThemedText
                      numberOfLines={1}
                      style={styles.directory}
                      themeColor="textSecondary"
                    >
                      {directory}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={{ ios: "chevron.right", android: "chevron_right" }}
                    size={14}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
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
  directory: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
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
  list: {
    gap: 8,
    marginTop: 18,
  },
  pressed: {
    opacity: 0.72,
  },
  repository: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    padding: 10,
  },
  repositoryCopy: {
    flex: 1,
  },
  repositoryIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  repositoryName: {
    fontSize: 14,
    fontWeight: "600",
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  state: {
    marginVertical: 24,
    textAlign: "center",
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
