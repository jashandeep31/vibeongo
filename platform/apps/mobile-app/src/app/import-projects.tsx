import { useGetDemoProjects, useImportDemoProjects } from "@repo/api-hooks";
import { useProjectsStore } from "@repo/app-store";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function ImportProjectsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const projects = useProjectsStore((store) => store.projects);
  const demosQuery = useGetDemoProjects();
  const importDemo = useImportDemoProjects();
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const demos = demosQuery.data ?? [];

  const handleImport = async (ownername: string, reponame: string) => {
    const key = `${ownername}/${reponame}`;
    setImportingKey(key);
    try {
      await importDemo.mutateAsync({ ownername, reponame });
      Toast.show({
        type: "success",
        text1: "Demo project imported",
        text2: "The project is ready on your home screen.",
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Could not import demo project",
        text2: "Please check your connection and try again.",
      });
    } finally {
      setImportingKey(null);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={() => router.back()}
            title="Import projects"
            titleOpacity={titleOpacity}
          />
        }
      >
        {({ topInset }) => (
          <View style={[styles.screen, { paddingTop: topInset }]}>
            <View style={styles.intro}>
              <ThemedText style={styles.title}>Demo projects</ThemedText>
              <ThemedText style={styles.description} themeColor="textSecondary">
                Pick a project to add to your workspace.
              </ThemedText>
            </View>

            {demosQuery.isPending ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary">
                  Loading demo projects…
                </ThemedText>
              </View>
            ) : demosQuery.isError ? (
              <View style={styles.centeredState}>
                <ThemedText style={styles.stateTitle}>
                  Could not load demo projects
                </ThemedText>
                <ThemedText
                  style={styles.stateDescription}
                  themeColor="textSecondary"
                >
                  Check your connection and try again.
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void demosQuery.refetch()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: theme.text },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    style={[styles.retryLabel, { color: theme.background }]}
                  >
                    Try again
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                onScroll={onTitleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.content}
                refreshControl={
                  <RefreshControl
                    onRefresh={() => void demosQuery.refetch()}
                    refreshing={demosQuery.isRefetching}
                    tintColor={theme.textSecondary}
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                {demos.map((demo) => {
                  const key = `${demo.ownername}/${demo.reponame}`;
                  const isImported = projects.some(
                    (project) => project.name === demo.project.name,
                  );
                  const isImporting = importingKey === key;

                  return (
                    <View
                      key={key}
                      style={[
                        styles.project,
                        { borderColor: theme.backgroundSelected },
                      ]}
                    >
                      <View style={styles.projectHeader}>
                        <ThemedText
                          numberOfLines={1}
                          style={styles.projectName}
                        >
                          {demo.project.name}
                        </ThemedText>
                        <Pressable
                          accessibilityLabel={
                            isImported
                              ? `${demo.project.name} is imported`
                              : `Import ${demo.project.name}`
                          }
                          accessibilityRole="button"
                          accessibilityState={{
                            busy: isImporting,
                            disabled: isImported || importDemo.isPending,
                          }}
                          disabled={isImported || importDemo.isPending}
                          onPress={() =>
                            void handleImport(demo.ownername, demo.reponame)
                          }
                          style={({ pressed }) => [
                            styles.importButton,
                            { backgroundColor: theme.text },
                            isImported && styles.disabled,
                            pressed && styles.pressed,
                          ]}
                        >
                          {isImporting ? (
                            <ActivityIndicator
                              color={theme.background}
                              size="small"
                            />
                          ) : (
                            <SymbolView
                              name={
                                isImported
                                  ? { ios: "checkmark", android: "check" }
                                  : { ios: "plus", android: "add" }
                              }
                              size={16}
                              tintColor={theme.background}
                              weight="semibold"
                            />
                          )}
                          <ThemedText
                            style={[
                              styles.importLabel,
                              { color: theme.background },
                            ]}
                          >
                            {isImported
                              ? "Imported"
                              : isImporting
                                ? "Importing…"
                                : "Import"}
                          </ThemedText>
                        </Pressable>
                      </View>
                      <ThemedText
                        style={styles.projectDescription}
                        themeColor="textSecondary"
                      >
                        {demo.description}
                      </ThemedText>
                      <ThemedText
                        style={styles.tags}
                        themeColor="textSecondary"
                      >
                        {demo.tags.join(" · ")}
                      </ThemedText>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 16,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  intro: { paddingBottom: 24, paddingHorizontal: 20, paddingTop: 18 },
  title: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  description: { fontSize: 14, lineHeight: 22, marginTop: 5 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  centeredState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  stateTitle: { fontSize: 18, fontWeight: "700" },
  stateDescription: { lineHeight: 22, textAlign: "center" },
  retryButton: {
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryLabel: { fontSize: 14, fontWeight: "700" },
  project: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 28,
    paddingBottom: 24,
  },
  projectHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 2,
  },
  projectName: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },
  projectDescription: {
    fontSize: 14,
    lineHeight: 22,
    paddingRight: 8,
    paddingTop: 14,
  },
  tags: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 17,
    paddingTop: 9,
  },
  importButton: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  importLabel: { fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
