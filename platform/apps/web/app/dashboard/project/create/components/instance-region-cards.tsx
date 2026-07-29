import { memo } from "react";
import { useInstanceRegions } from "@/hooks/use-instance-metadata";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { useConfigStore } from "@/store/config-store";

function InstanceRegionCards() {
  const { data: regions } = useInstanceRegions();
  const {
    provider,
    instanceRegionId: instanceRegion,
    setInstanceRegion,
  } = useConfigStore();
  const providerRegions = regions?.filter(
    (region) => region.provider === provider,
  );
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-sm">Region</Label>
      <div className="flex flex-wrap items-center gap-2">
        <TooltipProvider>
          {providerRegions?.map((region) => (
            <Tooltip key={region.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={instanceRegion === region.id}
                  onClick={() => setInstanceRegion(region.id)}
                  className={
                    instanceRegion === region.id
                      ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                      : ""
                  }
                >
                  {region.name}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{region.slug}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}

export default memo(InstanceRegionCards);
