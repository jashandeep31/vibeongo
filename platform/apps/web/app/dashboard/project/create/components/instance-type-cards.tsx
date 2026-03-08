import { Label } from "@repo/ui/components/label";

export default function InstanceTypeCards({
  instanceTypes,
  selectedInstanceType,
  setSelectedInstanceType,
}: {
  instanceTypes: any;
  selectedInstanceType: string | null;
  setSelectedInstanceType: (type: string | null) => void;
}) {
  if (!instanceTypes || !Array.isArray(instanceTypes) || instanceTypes.length === 0) return null;

  return (
    <div className="space-y-4">
      <Label className="text-sm text-muted-foreground">Instance Type</Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {instanceTypes.map((instance) => (
          <button
            onClick={() => setSelectedInstanceType(instance.id)}
            className={`flex flex-col text-left border rounded-lg p-4 transition-colors hover:border-primary ${
              selectedInstanceType === instance.id
                ? "border-orange-500 ring-1 ring-orange-500 bg-orange-500/5"
                : "bg-muted hover:bg-muted/80"
            }`}
            key={instance.id}
          >
            <div
              className={`font-medium mb-1 ${
                selectedInstanceType === instance.id ? "text-orange-500" : ""
              }`}
            >
              {instance.name}
            </div>
            {instance.description && (
              <div className="text-xs text-muted-foreground mb-4 line-clamp-2">
                {instance.description}
              </div>
            )}
            <div className="mt-auto w-full text-xs text-muted-foreground space-y-2">
              <div className="flex justify-between">
                <span>CPU:</span>
                <span className="font-medium text-foreground">{instance.cpu}</span>
              </div>
              <div className="flex justify-between">
                <span>RAM:</span>
                <span className="font-medium text-foreground">{instance.ram}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
