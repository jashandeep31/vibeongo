import { memo } from "react";
import { useInstanceRegions } from "@/hooks/use-instance-metadata";
import { Label } from "@repo/ui/components/label";
import { useConfigStore } from "@/store/config-store";

function InstanceRegionCards() {
  const { data: regions } = useInstanceRegions();
  const { instanceRegion, setInstanceRegion } = useConfigStore();
  return (
    <div className="space-y-4">
      <Label className="text-muted-foreground text-sm">Deployment Region</Label>
      <div className="flex flex-wrap items-center gap-4">
        {regions?.map((region) => (
          <button
            onClick={() => setInstanceRegion(region.id)}
            className={`hover:border-primary bg-muted hover:text-primary group rounded-md border p-2 text-sm transition-colors ${
              instanceRegion === region.id
                ? "border-orange-500 text-orange-500"
                : ""
            }`}
            key={region.id}
          >
            {region.name}
            <span
              className={`text-muted-foreground group-hover:text-primary block text-left text-xs transition-colors ${
                instanceRegion === region.id
                  ? "text-orange-500 group-hover:text-orange-500"
                  : ""
              }`}
            >
              {region.slug}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(InstanceRegionCards);
