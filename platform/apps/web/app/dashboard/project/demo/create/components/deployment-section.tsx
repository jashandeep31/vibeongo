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
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="text-sm">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {region.name}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {region.id}
                    </div>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-primary" />}
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
            <p className="mt-1 text-sm text-muted-foreground">
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
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-primary/50",
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Icon className="mb-2 h-5 w-5 text-muted-foreground" />
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <CardTitle className="text-lg">{instance.name}</CardTitle>
                    <CardDescription className="min-h-[40px] line-clamp-2">
                      {instance.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>CPU</span>
                        <span className="font-medium text-foreground">
                          {instance.cpu}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>RAM</span>
                        <span className="font-medium text-foreground">
                          {instance.ram}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t pt-4">
                      <div className="font-semibold text-foreground">
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
