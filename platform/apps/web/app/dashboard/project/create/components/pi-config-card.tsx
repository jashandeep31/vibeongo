"use client";

import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { CircleDot } from "lucide-react";
import { memo, type ChangeEvent } from "react";
import { useConfigStore } from "@/store/config-store";

function PiConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updatePiConfig = useConfigStore((s) => s.updatePiConfig);
  const authJson = additionalServices.piConfig.authJson;

  const onAuthJsonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updatePiConfig({
      authJson: e.target.value,
    });
  };

  return (
    <div className="border-primary bg-primary/5 ring-primary rounded-lg border p-6 ring-1">
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

            <div className="grid space-y-4 overflow-auto">
              <Label
                htmlFor="pi-authjson"
                className="text-foreground text-sm font-semibold"
              >
                Auth JSON Configuration
              </Label>
              <Textarea
                id="pi-authjson"
                value={authJson}
                onChange={onAuthJsonChange}
                placeholder='{"token": "xyz..."}'
                className="min-h-25 font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Provide auth configuration in JSON format for Pi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PiConfigCard);
