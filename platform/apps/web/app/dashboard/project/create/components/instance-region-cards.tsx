import { memo } from "react";
import { useInstanceRegions } from "@/hooks/use-instance-metadata";
import { Label } from "@repo/ui/components/label";

function InstanceRegionCards({
  selectedRegion,
  setSelectedRegion,
}: {
  selectedRegion: string | null;
  setSelectedRegion: (region: string | null) => void;
}) {
  const { data: regions } = useInstanceRegions();
  return (
    <div className="space-y-4">
      <Label className="text-sm text-muted-foreground">Deployment Region</Label>
      <div className="flex items-center flex-wrap gap-4">
        {regions?.map((region) => (
          <button
            onClick={() => setSelectedRegion(region.id)}
            className={`hover:border-primary text-sm border bg-muted rounded-md p-2 hover:text-primary transition-colors group ${
              selectedRegion === region.id
                ? "border-orange-500 text-orange-500"
                : ""
            }`}
            key={region.id}
          >
            {region.name}
            <span
              className={`block text-xs text-muted-foreground text-left group-hover:text-primary transition-colors ${
                selectedRegion === region.id
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
