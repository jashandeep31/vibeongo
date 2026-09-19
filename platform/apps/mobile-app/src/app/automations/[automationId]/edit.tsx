import type { CreateProjectAutomationInput } from "@repo/api-client";
import {
  useGetProjectAutomation,
  useUpdateProjectAutomation,
} from "@repo/api-hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";

import { AutomationFormScreen } from "@/components/automations/automation-form-screen";
import { getApiErrorMessage } from "@/components/automations/automation-utils";
import { ThemedText } from "@/components/themed-text";

export default function EditAutomationScreen() {
  const params = useLocalSearchParams<{ automationId?: string | string[] }>();
  const automationId =
    typeof params.automationId === "string" ? params.automationId : null;
  const router = useRouter();
  const query = useGetProjectAutomation(automationId);
  const mutation = useUpdateProjectAutomation();
  const [error, setError] = useState<string | null>(null);
  if (query.isPending)
    return (
      <Centered>
        <ActivityIndicator />
        <ThemedText>Loading automation…</ThemedText>
      </Centered>
    );
  if (query.isError || !query.data || !automationId)
    return (
      <Centered>
        <ThemedText style={styles.error}>
          Automation could not be loaded.
        </ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.link}>Go back</ThemedText>
        </Pressable>
      </Centered>
    );
  const automation = query.data.project_automation;
  const initialValues: CreateProjectAutomationInput = {
    name: automation.name,
    description: automation.description ?? undefined,
    project_id: automation.project_id,
    cron_expression: automation.cron_expression ?? "",
    timezone: automation.timezone ?? "",
    tasks: query.data.tasks.map((task, index) => ({
      path_from_code: task.path_from_code,
      task_prompt: task.task_prompt,
      agent: task.agent,
      model: task.model ?? undefined,
      order_number: index + 1,
    })),
  };
  const submit = async (input: CreateProjectAutomationInput) => {
    setError(null);
    try {
      await mutation.mutateAsync({ id: automationId, input });
      Toast.show({ type: "success", text1: "Automation updated" });
      router.replace(`/automations/${automationId}` as never);
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          "Could not update the automation. Try again.",
        ),
      );
    }
  };
  return (
    <AutomationFormScreen
      initialValues={initialValues}
      isPending={mutation.isPending}
      mode="edit"
      onSubmit={submit}
      submitError={error}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}
const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  error: { color: "#dc2626", fontWeight: "700" },
  link: { fontWeight: "700", textDecorationLine: "underline" },
});
