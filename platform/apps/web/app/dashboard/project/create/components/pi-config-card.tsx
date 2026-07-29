"use client";

import { Label } from "@repo/ui/components/label";
import { CircleDot } from "lucide-react";
import { memo } from "react";
import { useConfigStore } from "@/store/config-store";
import SensitiveAuthJsonField from "./sensitive-auth-json-field";

function PiConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updatePiConfig = useConfigStore((s) => s.updatePiConfig);
  const authJson = additionalServices.piConfig.authJson;

  const onAuthJsonChange = (authJsonValue: string) => {
    updatePiConfig({
      authJson: authJsonValue,
    });
  };

  return (
    <div className="bg-card border-border max-w-full min-w-0 overflow-hidden rounded-lg border p-3">
      <div className="max-w-full min-w-0 space-y-3">
        <div>
          <Label
            htmlFor="pi-authjson"
            className="text-foreground flex items-center text-sm font-medium"
          >
            <CircleDot className="mr-2 size-4" />
            Pi
          </Label>
        </div>
        <SensitiveAuthJsonField
          id="pi-authjson"
          serviceName="Pi"
          value={authJson}
          onChange={onAuthJsonChange}
        />
      </div>
    </div>
  );
}

export default memo(PiConfigCard);
