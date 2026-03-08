"use client";

import { Label } from "@repo/ui/components/label";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Button } from "@repo/ui/components/button";
import { Trash2, Plus } from "lucide-react";

export interface PortRule {
  port: string;
  protocol: "TCP" | "UDP";
}

interface NetworkFirewallCardProps {
  rules: PortRule[];
  onRulesChange: (rules: PortRule[]) => void;
}

export default function NetworkFirewallCard({
  rules,
  onRulesChange,
}: NetworkFirewallCardProps) {
  const addRule = () => {
    onRulesChange([...rules, { port: "", protocol: "TCP" }]);
  };

  const removeRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<PortRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates } as PortRule;
    onRulesChange(newRules);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm text-muted-foreground">
          Networks & Firewall
        </Label>
      </div>
      <div className="border rounded-lg p-6 bg-card space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_120px_40px] gap-6 items-center px-1 pb-4 border-b">
            <Label className="text-sm font-medium text-muted-foreground">
              Port
            </Label>
            <Label className="text-sm font-medium text-muted-foreground">
              Protocol
            </Label>
            <div></div>
          </div>

          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_120px_40px] gap-6 items-center"
              >
                <Input
                  placeholder="e.g. 80"
                  value={rule.port}
                  onChange={(e) => updateRule(index, { port: e.target.value })}
                  className="h-10 font-medium"
                />
                <Select
                  value={rule.protocol}
                  onValueChange={(value: "TCP" | "UDP") =>
                    updateRule(index, { protocol: value })
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TCP">TCP</SelectItem>
                    <SelectItem value="UDP">UDP</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(index)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          onClick={addRule}
          className="w-full border-dashed hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-foreground h-10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Port Rule
        </Button>
      </div>
    </div>
  );
}
