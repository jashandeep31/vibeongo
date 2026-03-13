import { memo } from "react";
import { Label } from "@repo/ui/components/label";
import DockerConfigCard from "./docker-config-card";
// import { useConfigStore } from "@/store/config-store";

function AdditionalServices() {
  // const additionalServices = useConfigStore((s) => s.additionalServices);
  // const dockerConfig = additionalServices.dockerConfig;
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-muted-foreground text-sm">
          Additional Services
        </Label>
      </div>
      <div>
        <DockerConfigCard />
      </div>
    </div>
  );
}

export default memo(AdditionalServices);
