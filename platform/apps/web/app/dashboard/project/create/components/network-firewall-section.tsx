import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Plus, Trash2 } from "lucide-react";

import type { PortRule } from "./types";

type NetworkFirewallSectionProps = {
  ports: PortRule[];
  onAddPort: () => void;
  onUpdatePort: (id: number, field: "port" | "protocol", value: string) => void;
  onRemovePort: (id: number) => void;
};

export function NetworkFirewallSection({
  ports,
  onAddPort,
  onUpdatePort,
  onRemovePort,
}: NetworkFirewallSectionProps) {
  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <Label className="text-base font-semibold">Network & Firewall</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure inbound port rules to expose your services to the internet.
        </p>
      </div>

      <div className="max-w-3xl space-y-4 rounded-xl border border-border/50 bg-secondary/10 p-4">
        <div className="hidden grid-cols-12 gap-4 border-b border-border/50 px-1 pb-2 text-sm font-medium text-muted-foreground md:grid">
          <div className="col-span-5">Port</div>
          <div className="col-span-5">Protocol</div>
          <div className="col-span-2"></div>
        </div>

        {ports.map((portRule) => (
          <div
            key={portRule.id}
            className="grid grid-cols-1 items-end gap-2 rounded-lg border border-border/50 bg-background/50 p-3 md:grid-cols-12 md:items-center md:gap-4 md:border-none md:bg-transparent md:p-0"
          >
            <div className="col-span-1 space-y-1 md:col-span-5 md:space-y-0">
              <Label className="text-xs md:hidden">Port</Label>
              <Input
                type="number"
                placeholder="e.g. 8080"
                value={portRule.port}
                onChange={(event) =>
                  onUpdatePort(portRule.id, "port", event.target.value)
                }
                className="h-9 bg-background md:bg-transparent"
              />
            </div>

            <div className="col-span-1 space-y-1 md:col-span-5 md:space-y-0">
              <Label className="text-xs md:hidden">Protocol</Label>
              <Select
                value={portRule.protocol}
                onValueChange={(value) =>
                  onUpdatePort(portRule.id, "protocol", value)
                }
              >
                <SelectTrigger className="h-9 bg-background md:bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TCP">TCP</SelectItem>
                  <SelectItem value="UDP">UDP</SelectItem>
                  <SelectItem value="Both">TCP/UDP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1 flex justify-end md:col-span-2 md:justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => onRemovePort(portRule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddPort}
            className="h-9 w-full border-dashed border-muted-foreground/30 bg-transparent transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Port Rule
          </Button>
        </div>
      </div>
    </div>
  );
}
