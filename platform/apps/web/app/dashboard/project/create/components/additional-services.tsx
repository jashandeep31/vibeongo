import { memo } from "react";
import { Label } from "@repo/ui/components/label";
import DockerConfigCard from "./docker-config-card";

interface AdditionalServicesProps {
  dockerEnabled: boolean;
  onDockerEnabledChange: (enabled: boolean) => void;
}

function AdditionalServices({
  dockerEnabled,
  onDockerEnabledChange,
}: AdditionalServicesProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm text-muted-foreground">
          Additional Services
        </Label>
      </div>
      <div>
        <DockerConfigCard
          dockerEnabled={dockerEnabled}
          onDockerEnabledChange={onDockerEnabledChange}
        />
      </div>
    </div>
  );
}

export default memo(AdditionalServices);
