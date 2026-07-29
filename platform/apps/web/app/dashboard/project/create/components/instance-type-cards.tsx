import { memo } from "react";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { useConfigStore } from "@/store/config-store";
import { useInstanceTypesByRegionID } from "@/hooks/use-instance-metadata";
import { Cpu } from "lucide-react";

const formatHourlyPrice = (pricePerHour: number) =>
  `$${(pricePerHour / 10000).toFixed(4)}/hr`;

const formatAverageMonthlyPrice = (pricePerHour: number) =>
  `$${((pricePerHour / 10000) * 8 * 30).toFixed(2)}/mo`;

function InstanceTypeCards() {
  const {
    instanceRegionId: instanceRegion,
    instanceTypeId,
    setInstanceTypeId,
  } = useConfigStore();
  const { isLoading, data: instanceTypes } = useInstanceTypesByRegionID({
    regionId: instanceRegion,
  });
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Instance type</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-52 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (
    !instanceTypes ||
    !Array.isArray(instanceTypes) ||
    instanceTypes.length === 0
  )
    return null;

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-sm">Instance type</Label>
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          {instanceTypes.map((instance) => (
            <Tooltip key={instance.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={instanceTypeId === instance.id}
                  onClick={() => setInstanceTypeId(instance.id)}
                  className={`h-12 min-w-52 justify-start gap-2 px-3 text-left ${
                    instanceTypeId === instance.id
                      ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                      : ""
                  }`}
                >
                  <Cpu className="size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate">{instance.name}</span>
                    <span className="text-muted-foreground mt-0.5 block text-[10px] font-normal">
                      {instance.cpu || "N/A"} · {instance.ram || "N/A"} ·{" "}
                      {formatHourlyPrice(instance.price_per_hour)}
                    </span>
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-72">
                <span className="flex flex-col gap-1">
                  {instance.description ? (
                    <span>{instance.description}</span>
                  ) : null}
                  <span className="text-background/70">
                    About {formatAverageMonthlyPrice(instance.price_per_hour)}{" "}
                    at 8 hours/day.
                  </span>
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}

export default memo(InstanceTypeCards);
