import { memo } from "react";
import { Label } from "@repo/ui/components/label";
import CodexConfigCard from "./codex-config-card";
import OpencodeConfigCard from "./opencode-config-card";
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
      <div className="space-y-4">
        {/* <DockerConfigCard /> */}
        <OpencodeConfigCard />
        <CodexConfigCard />
        {/* <NvimConfigCard /> */}
      </div>
    </div>
  );
}

export default memo(AdditionalServices);
