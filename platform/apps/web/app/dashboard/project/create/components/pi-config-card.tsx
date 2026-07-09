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
    <div className="bg-card border-border rounded-lg border p-6">
      <div className="flex items-start space-x-3">
        <div className="w-full space-y-1">
          <Label
            htmlFor="pi-authjson"
            className="text-foreground flex items-center text-base font-semibold"
          >
            <CircleDot className="mr-2 h-5 w-5" />
            Pi Integration
          </Label>
          <p className="text-muted-foreground text-sm">
            Setup and configure Pi agent.
          </p>

          <div className="w-full pt-6">
            <div className="border-border mb-6 border-t"></div>

            <SensitiveAuthJsonField
              id="pi-authjson"
              serviceName="Pi"
              value={authJson}
              onChange={onAuthJsonChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PiConfigCard);
