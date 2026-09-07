import type { ProjectTemplate } from "@repo/api-client";
import { useGetProjectTemplates } from "@repo/api-hooks";
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

import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { CreateProjectFromTemplateDrawer } from "@/components/projects/create-project-from-template-drawer";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function TemplatesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const templatesQuery = useGetProjectTemplates();
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplate | null>(null);
  const templates = templatesQuery.data ?? [];

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
                {templates.length === 0 ? (
                  <ThemedText themeColor="textSecondary">
                    No project templates are available yet.
                  </ThemedText>
                ) : (
                  templates.map((template) => {
                    const services = template.config.packages
                      .map((service) => service.name)
                      .join(" · ");
                    const ports = template.config.ports
                      .map(
                        (port) => `${port.port}/${port.protocol.toLowerCase()}`,
                      )
                      .join(" · ");

                    return (
                      <View
                        key={template.id}
                        style={[
                          styles.template,
                          { borderColor: theme.backgroundSelected },
                        ]}
                      >
                        <View style={styles.templateHeader}>
                          <ThemedText
                            numberOfLines={1}
                            style={styles.templateName}
                          >
                            {template.name}
                          </ThemedText>
                          <Pressable
                            accessibilityLabel={`Create a project from ${template.name}`}
                            accessibilityRole="button"
                            onPress={() => setSelectedTemplate(template)}
                            style={({ pressed }) => [
                              styles.createButton,
                              { backgroundColor: theme.text },
                              pressed && styles.pressed,
                            ]}
                          >
                            <SymbolView
                              name={{ ios: "plus", android: "add" }}
                              size={16}
                              tintColor={theme.background}
                              weight="semibold"
                            />
                            <ThemedText
                              style={[
                                styles.buttonLabel,
                                { color: theme.background },
                              ]}
                            >
                              Create
                            </ThemedText>
                          </Pressable>
                        </View>
                        <ThemedText
                          style={styles.description}
                          themeColor="textSecondary"
                        >
                          {template.description ||
                            "Ready-to-use project template"}
                        </ThemedText>
                        <ThemedText
                          style={styles.metadata}
                          themeColor="textSecondary"
                        >
                          {[services, ports].filter(Boolean).join(" · ")}
                        </ThemedText>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        )}
      </PageChromeLayout>

      <CreateProjectFromTemplateDrawer
        onClose={() => setSelectedTemplate(null)}
        template={selectedTemplate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20, paddingTop: 18 },
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
  template: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 28,
    paddingBottom: 24,
  },
  templateHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  templateName: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    paddingRight: 8,
    paddingTop: 14,
  },
  metadata: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 17,
    paddingTop: 9,
  },
  createButton: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  buttonLabel: { fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
