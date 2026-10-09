import type { ProjectTemplate } from "@repo/api-client";
import { useGetProjectTemplates } from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { CreateProjectFromTemplateDrawer } from "./create-project-from-template-drawer";

export function ProjectTemplateList() {
  const theme = useTheme();
  const query = useGetProjectTemplates();
  const templates = query.data ?? [];
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplate | null>(null);
  if (query.isPending)
    return (
      <View style={styles.state}>
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">Loading templates…</ThemedText>
      </View>
    );
  if (query.isError)
    return (
      <View style={styles.state}>
        <ThemedText accessibilityRole="alert">
          Could not load templates.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          style={[styles.retry, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText>Try again</ThemedText>
        </Pressable>
      </View>
    );
  return (
    <>
      <View>
        {templates.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            No project templates are available yet.
          </ThemedText>
        ) : (
          templates.map((template, index) => (
            <Pressable
              key={template.id}
              accessibilityLabel={`Create a project from ${template.name}`}
              accessibilityRole="button"
              onPress={() => setSelectedTemplate(template)}
              style={({ pressed }) => [
                styles.template,
                { borderColor: theme.backgroundSelected },
                index === templates.length - 1 && { borderBottomWidth: 0 },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.copy}>
                <ThemedText style={styles.templateName}>
                  {template.name}
                </ThemedText>
                <ThemedText
                  numberOfLines={2}
                  style={styles.description}
                  themeColor="textSecondary"
                >
                  {template.description || "Ready-to-use project template"}
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={18}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          ))
        )}
      </View>
      <CreateProjectFromTemplateDrawer
        onClose={() => setSelectedTemplate(null)}
        template={selectedTemplate}
      />
    </>
  );
}
const styles = StyleSheet.create({
  state: { gap: 12, alignItems: "center", paddingVertical: 16 },
  retry: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  template: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  templateName: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  description: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.72 },
});
