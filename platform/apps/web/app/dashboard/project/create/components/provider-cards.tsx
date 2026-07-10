import { memo } from "react";
import { useConfigStore } from "@/store/config-store";
import { Label } from "@repo/ui/components/label";
import { Cloud, Server } from "lucide-react";
import { type ProjectProvider } from "@repo/shared";

const providers: {
  id: ProjectProvider;
  name: string;
  description: string;
  Icon: typeof Cloud;
}[] = [
  {
    id: "aws",
    name: "AWS",
    description: "Deploy on Amazon Web Services regions and instance types.",
    Icon: Cloud,
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    description: "Deploy on DigitalOcean regions and Droplet sizes.",
    Icon: Server,
  },
];

function ProviderCards() {
  const { provider, setProvider } = useConfigStore();

  return (
    <div className="space-y-4">
      <Label className="text-muted-foreground text-sm">Cloud Provider</Label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {providers.map(({ id, name, description, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setProvider(id)}
            className={`hover:border-primary flex min-h-[112px] w-full min-w-0 items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
              provider === id
                ? "border-primary bg-primary/5 text-primary ring-primary ring-1"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <span
              className={`mt-0.5 rounded-md border p-2 ${
                provider === id
                  ? "border-primary/40 bg-primary/10"
                  : "bg-background"
              }`}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 space-y-1">
              <span className="block font-medium">{name}</span>
              <span
                className={`block text-sm ${
                  provider === id ? "text-primary/80" : "text-muted-foreground"
                }`}
              >
                {description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(ProviderCards);
