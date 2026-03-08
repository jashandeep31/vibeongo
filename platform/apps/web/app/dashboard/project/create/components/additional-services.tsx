import { Label } from "@repo/ui/components/label";
import DockerConfigCard from "./docker-config-card";

interface AdditionalServicesProps {
  dockerEnabled: boolean;
  onDockerEnabledChange: (enabled: boolean) => void;
  selectedContainers: string[];
  onSelectedContainersChange: (containers: string[]) => void;
}

export default function AdditionalServices({
  dockerEnabled,
  onDockerEnabledChange,
  selectedContainers,
  onSelectedContainersChange,
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
          selectedContainers={selectedContainers}
          onSelectedContainersChange={onSelectedContainersChange}
        />
      </div>
    </div>
  );
}
