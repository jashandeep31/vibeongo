import { memo } from "react";
import { useConfigStore } from "@/store/config-store";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { providerOptions } from "./provider-options";
import { Sparkles } from "lucide-react";

function ProviderCards() {
  const { provider, setProvider } = useConfigStore();

  return (
    <div className="space-y-2">
      <Label className="text-sm">Cloud compute</Label>
      <div className="flex flex-wrap items-center gap-2 pt-1.5">
        <TooltipProvider>
          {providerOptions.map(
            ({ id, name, serviceName, description, recommended, Logo }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`${name} ${serviceName}`}
                    aria-pressed={provider === id}
                    onClick={() => setProvider(id)}
                    className={`relative h-10 min-w-32 justify-start gap-2.5 px-3 ${
                      provider === id
                        ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                        : recommended
                          ? "border-amber-300/80 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/5"
                          : ""
                    }`}
                  >
                    {recommended ? (
                      <Badge
                        variant="outline"
                        className="absolute -top-2 right-1 h-4 border-amber-300 bg-amber-100 px-1.5 text-[9px] leading-none text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                      >
                        <Sparkles />
                        Recommended
                      </Badge>
                    ) : null}
                    <span className="h-5 w-7 shrink-0">
                      <Logo className="size-full" />
                    </span>
                    <span className="flex flex-col items-start leading-none">
                      <span>{name}</span>
                      <span className="text-muted-foreground mt-1 text-[10px] font-normal">
                        {serviceName}
                      </span>
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{description}</TooltipContent>
              </Tooltip>
            ),
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}

export default memo(ProviderCards);
