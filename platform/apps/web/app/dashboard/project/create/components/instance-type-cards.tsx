import { memo } from "react";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";

function InstanceTypeCards({
  instanceTypes,
  selectedInstanceType,
  setSelectedInstanceType,
  isLoading,
}: {
  instanceTypes: any;
  selectedInstanceType: string | null;
  setSelectedInstanceType: (type: string | null) => void;
  isLoading?: boolean;
}) {
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
            onClick={() => setSelectedInstanceType(instance.id)}
            className={`hover:border-primary flex flex-col rounded-lg border p-4 text-left transition-colors ${
              selectedInstanceType === instance.id
                ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500"
                : "bg-muted hover:bg-muted/80"
            }`}
            key={instance.id}
          >
            <div
              className={`mb-1 font-medium ${
                selectedInstanceType === instance.id ? "text-orange-500" : ""
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
                <span>CPU:</span>
                <span className="text-foreground font-medium">
                  {instance.cpu}
                </span>
              </div>
              <div className="flex justify-between">
                <span>RAM:</span>
                <span className="text-foreground font-medium">
                  {instance.ram}
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
