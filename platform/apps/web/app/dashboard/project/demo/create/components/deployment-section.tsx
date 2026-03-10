import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { Check } from "lucide-react";

import type { InstanceOption, RegionOption } from "./options";

type DeploymentSectionProps = {
  regions: RegionOption[];
  instances: InstanceOption[];
  selectedRegion: string;
  selectedInstance: string;
  onRegionSelect: (regionId: string) => void;
  onInstanceSelect: (instanceId: string) => void;
};

export function DeploymentSection({
  regions,
  instances,
  selectedRegion,
  selectedInstance,
  onRegionSelect,
  onInstanceSelect,
}: DeploymentSectionProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Label className="text-base font-semibold">Deployment Region</Label>
        <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
          {regions.map((region) => {
            const Icon = region.icon;
            const isSelected = selectedRegion === region.id;

            return (
              <button
                key={region.id}
                type="button"
                onClick={() => onRegionSelect(region.id)}
                className={cn(
                  "relative flex rounded-lg border p-4 text-left shadow-sm transition-all focus:outline-none",
                  isSelected
                    ? "border-primary bg-primary/5 ring-primary ring-1"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="text-sm">
                    <div className="text-foreground flex items-center gap-2 font-medium">
                      <Icon className="text-muted-foreground h-4 w-4" />
                      {region.name}
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {region.id}
                    </div>
                  </div>
                  {isSelected && <Check className="text-primary h-5 w-5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRegion && (
        <div className="space-y-4 border-t pt-6">
          <div>
            <Label className="text-base font-semibold">Instance Type</Label>
            <p className="text-muted-foreground mt-1 text-sm">
              Select the computing resources for your project.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {instances.map((instance) => {
              const Icon = instance.icon;
              const isSelected = selectedInstance === instance.id;

              return (
                <Card
                  key={instance.id}
                  onClick={() => onInstanceSelect(instance.id)}
                  className={cn(
                    "cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-primary ring-1"
                      : "hover:border-primary/50",
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Icon className="text-muted-foreground mb-2 h-5 w-5" />
                      {isSelected && <Check className="text-primary h-4 w-4" />}
                    </div>
                    <CardTitle className="text-lg">{instance.name}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                      {instance.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground mb-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>CPU</span>
                        <span className="text-foreground font-medium">
                          {instance.cpu}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>RAM</span>
                        <span className="text-foreground font-medium">
                          {instance.ram}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t pt-4">
                      <div className="text-foreground font-semibold">
                        {instance.price}
                      </div>
                      <Badge variant="secondary">{instance.id}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
