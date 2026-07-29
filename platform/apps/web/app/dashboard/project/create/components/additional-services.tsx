import { memo } from "react";
import { Label } from "@repo/ui/components/label";
import CodexConfigCard from "./codex-config-card";
import DockerConfigCard from "./docker-config-card";
import OpencodeConfigCard from "./opencode-config-card";
import PiConfigCard from "./pi-config-card";

function AdditionalServices() {
  return (
    <div className="max-w-full min-w-0 space-y-2">
      <Label className="text-sm">Additional services</Label>
      <div className="max-w-full min-w-0 space-y-2">
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
