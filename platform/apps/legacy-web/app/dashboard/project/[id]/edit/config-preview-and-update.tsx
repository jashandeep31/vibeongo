"use client";

import { useUpdateProject } from "@/hooks/use-project";
import { useConfigStore } from "@/store/config-store";
import { Button } from "@repo/ui/components/button";
import { projectConfigValidator } from "@repo/shared";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buildProjectConfigPayload } from "../../create/components/project-config-payload";
import {
  getProjectSubmissionError,
  validateProjectConfig,
} from "../../create/components/project-config-validation";
import { scrollToProjectConfigErrors } from "../../create/components/project-config-errors";

export default function ConfigPreviewAndUpdate({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const configState = useConfigStore();
  const { mutateAsync, isPending } = useUpdateProject();
  const setSubmissionErrors = useConfigStore(
    (state) => state.setSubmissionErrors,
  );
  const setHasAttemptedSubmit = useConfigStore(
    (state) => state.setHasAttemptedSubmit,
  );
  const resetSubmissionErrors = useConfigStore(
    (state) => state.resetSubmissionErrors,
  );

  return (
    <div>
      <Button
        disabled={isPending}
        type="button"
        onClick={async () => {
          const validationErrors = validateProjectConfig(
            useConfigStore.getState(),
          );
          setHasAttemptedSubmit(true);
          setSubmissionErrors(validationErrors);

          if (validationErrors.length) {
            toast.error("Please fix the project configuration errors");
            scrollToProjectConfigErrors();
            return;
          }

          const toastId = toast.loading("Saving project");
          try {
            const config = buildProjectConfigPayload(configState);
            projectConfigValidator.parse(config);
            await mutateAsync({
              id: projectId,
              projectData: config,
            });
            resetSubmissionErrors();
            toast.success("Project saved", { id: toastId });
            router.push(`/dashboard/project/${projectId}`);
          } catch (error) {
            console.error(error);
            setSubmissionErrors([
              getProjectSubmissionError(error, "Failed to save project"),
            ]);
            toast.error("Project changes could not be saved", { id: toastId });
            scrollToProjectConfigErrors();
          }
        }}
      >
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
