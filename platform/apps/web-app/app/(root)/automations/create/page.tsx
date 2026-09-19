"use client";

import { ProjectAutomationForm } from "@/components/project-automation-form";
import { useCreateProjectAutomation } from "@repo/api-hooks";
import type { CreateProjectAutomationInput } from "@repo/api-client";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateAutomationPage() {
  const router = useRouter();
  const mutation = useCreateProjectAutomation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (values: CreateProjectAutomationInput) => {
    setSubmitError(null);
    try {
      await mutation.mutateAsync(values);
      toast.success("Automation created");
      router.push("/automations");
    } catch (error) {
      const message = axios.isAxiosError<{ message?: unknown }>(error)
        ? error.response?.data?.message
        : undefined;
      setSubmitError(
        typeof message === "string"
          ? message
          : "Could not create the automation. Try again.",
      );
    }
  };

  return (
    <ProjectAutomationForm
      mode="create"
      isPending={mutation.isPending}
      submitError={submitError}
      onSubmit={handleSubmit}
    />
  );
}
