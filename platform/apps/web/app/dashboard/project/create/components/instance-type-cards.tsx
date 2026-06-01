import { memo } from "react";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { useConfigStore } from "@/store/config-store";
import { useInstanceTypesByRegionID } from "@/hooks/use-instance-metadata";
import { CircleHelp } from "lucide-react";

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
      <div className="space-y-4">
        <Label className="text-muted-foreground text-sm">Instance Type</Label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex h-[140px] flex-col rounded-lg border p-4 text-left"
            >
              <Skeleton className="mb-1 h-5 w-24" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-3/4" />
              <div className="mt-auto w-full space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
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
    <div className="space-y-4">
      <Label className="text-muted-foreground text-sm">Instance Type</Label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {instanceTypes.map((instance) => (
          <button
            onClick={() => setInstanceTypeId(instance.id)}
            className={`hover:border-primary flex flex-col rounded-lg border p-4 text-left transition-colors ${
              instanceTypeId === instance.id
                ? "border-primary bg-primary/5 ring-primary ring-1"
                : "bg-muted hover:bg-muted/80"
            }`}
            key={instance.id}
          >
            <div
              className={`mb-1 font-medium ${
                instanceTypeId === instance.id ? "text-primary" : ""
              }`}
            >
              {instance.name}
            </div>
            {instance.description && (
              <div className="text-muted-foreground mb-4 line-clamp-2 text-xs">
                {instance.description}
              </div>
            )}
            <div className="text-muted-foreground mt-auto w-full space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="text-foreground font-medium">
                  {formatHourlyPrice(instance.price_per_hour)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="inline-flex items-center gap-1.5">
                  Avg monthly:
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="text-muted-foreground hover:text-foreground inline-flex"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <CircleHelp className="size-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Calculated as hourly price x 8 hours/day x 30 days.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="text-foreground font-medium">
                  {formatAverageMonthlyPrice(instance.price_per_hour)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>CPU/RAM:</span>
                <span className="text-foreground font-medium">
                  {instance.cpu} / {instance.ram}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(InstanceTypeCards);
