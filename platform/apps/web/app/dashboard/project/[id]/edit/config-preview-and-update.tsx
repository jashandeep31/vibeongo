"use client";

import { useUpdateProject } from "@/hooks/use-project";
import { useConfigStore } from "@/store/config-store";
import { Button } from "@repo/ui/components/button";
import { projectConfigValidator } from "@repo/shared";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buildProjectConfigPayload } from "../../create/components/project-config-payload";

export default function ConfigPreviewAndUpdate({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const configState = useConfigStore();
  const { mutateAsync, isPending } = useUpdateProject();

  return (
    <div>
      <Button
        disabled={isPending}
        type="button"
        onClick={async () => {
          const toastId = toast.loading("Saving project");
          try {
            const config = buildProjectConfigPayload(configState);
            projectConfigValidator.parse(config);
            await mutateAsync({
              id: projectId,
              projectData: config,
            });
            toast.success("Project saved", { id: toastId });
            router.push(`/dashboard/project/${projectId}`);
          } catch (error) {
            console.error(error);
            toast.error(
              error instanceof Error ? error.message : "Failed to save project",
              { id: toastId },
            );
          }
        }}
      >
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
