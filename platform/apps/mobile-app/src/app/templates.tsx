import { useGetProjectTemplates } from "@repo/api-hooks";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { ProjectTemplateList } from "@/components/projects/project-template-list";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export default function TemplatesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const templatesQuery = useGetProjectTemplates();

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={() => router.back()}
            title="Templates"
            titleOpacity={titleOpacity}
          />
        }
      >
        {({ topInset }) => (
          <View style={[styles.screen, { paddingTop: topInset }]}>
            {templatesQuery.isPending ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary">
                  Loading templates…
                </ThemedText>
              </View>
            ) : templatesQuery.isError ? (
              <View style={styles.centeredState}>
                <ThemedText style={styles.stateTitle}>
                  Could not load templates
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void templatesQuery.refetch()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: theme.text },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    style={[styles.buttonLabel, { color: theme.background }]}
                  >
                    Try again
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.content}
                onScroll={onTitleScroll}
                refreshControl={
                  <RefreshControl
                    onRefresh={() => void templatesQuery.refetch()}
                    refreshing={templatesQuery.isRefetching}
                    tintColor={theme.textSecondary}
                  />
                }
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
              >
                <ProjectTemplateList />
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
  content: { paddingBottom: 24, paddingHorizontal: 24, paddingTop: 4 },
  centeredState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  stateTitle: { fontSize: 18, fontWeight: "700" },
  retryButton: {
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonLabel: { fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
