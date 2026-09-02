import { useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NewProjectChatScreen } from "@/components/projects/new-project-chat-screen";
import { ProjectChatScreen } from "@/components/projects/project-chat-screen";
import { useTheme } from "@/hooks/use-theme";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function ProjectChatWorkspace() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ chatId?: string | string[] }>();
  const chatId = firstParam(params.chatId);

  return (
    <SafeAreaView
      style={[styles.workspace, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.workspace}
      >
        {chatId && chatId !== "new" ? (
          <ProjectChatScreen />
        ) : (
          <NewProjectChatScreen />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  workspace: { flex: 1 },
});
