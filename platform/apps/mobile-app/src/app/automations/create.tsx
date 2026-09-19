import type { CreateProjectAutomationInput } from "@repo/api-client";
import { useCreateProjectAutomation } from "@repo/api-hooks";
import { useRouter } from "expo-router";
import { useState } from "react";
import Toast from "react-native-toast-message";

import { AutomationFormScreen } from "@/components/automations/automation-form-screen";
import { getApiErrorMessage } from "@/components/automations/automation-utils";

export default function CreateAutomationScreen() {
  const router = useRouter();
  const mutation = useCreateProjectAutomation();
  const [error, setError] = useState<string | null>(null);
  const submit = async (input: CreateProjectAutomationInput) => {
    setError(null);
    try {
      await mutation.mutateAsync(input);
      Toast.show({ type: "success", text1: "Automation created" });
      router.replace("/automations" as never);
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          "Could not create the automation. Try again.",
        ),
      );
    }
  };
  return (
    <AutomationFormScreen
      isPending={mutation.isPending}
      mode="create"
      onSubmit={submit}
      submitError={error}
    />
  );
}
