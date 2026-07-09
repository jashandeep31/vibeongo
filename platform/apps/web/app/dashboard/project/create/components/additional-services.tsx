import { memo } from "react";
import { Label } from "@repo/ui/components/label";
import CodexConfigCard from "./codex-config-card";
import DockerConfigCard from "./docker-config-card";
import OpencodeConfigCard from "./opencode-config-card";
import PiConfigCard from "./pi-config-card";

function AdditionalServices() {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-muted-foreground text-sm">
          Additional Services
        </Label>
      </div>
      <div className="space-y-4">
        <DockerConfigCard />
        <OpencodeConfigCard />
        <CodexConfigCard />
        <PiConfigCard />
        {/* <NvimConfigCard /> */}
      </div>
    </div>
  );
}

export default memo(AdditionalServices);
