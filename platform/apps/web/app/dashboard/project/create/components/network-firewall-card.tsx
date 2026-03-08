"use client";

import { memo, useCallback, type Dispatch, type SetStateAction } from "react";
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
import { createPortRule, type PortRule } from "../types";

interface NetworkFirewallCardProps {
  rules: PortRule[];
  onRulesChange: Dispatch<SetStateAction<PortRule[]>>;
}

interface FirewallRuleRowProps {
  rule: PortRule;
  onPortChange: (id: string, port: string) => void;
  onProtocolChange: (id: string, protocol: PortRule["protocol"]) => void;
  onRemoveRule: (id: string) => void;
}

const FirewallRuleRow = memo(function FirewallRuleRow({
  rule,
  onPortChange,
  onProtocolChange,
  onRemoveRule,
}: FirewallRuleRowProps) {
  return (
    <div className="grid grid-cols-[1fr_120px_40px] gap-6 items-center">
      <Input
        placeholder="e.g. 80"
        value={rule.port}
        onChange={(e) => onPortChange(rule.id, e.target.value)}
        className="h-10 font-medium"
      />
      <Select
        value={rule.protocol}
        onValueChange={(value: PortRule["protocol"]) =>
          onProtocolChange(rule.id, value)
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
          onClick={() => onRemoveRule(rule.id)}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

function NetworkFirewallCard({
  rules,
  onRulesChange,
}: NetworkFirewallCardProps) {
  const addRule = useCallback(() => {
    onRulesChange((currentRules) => [...currentRules, createPortRule("")]);
  }, [onRulesChange]);

  const removeRule = useCallback(
    (id: string) => {
      onRulesChange((currentRules) =>
        currentRules.filter((rule) => rule.id !== id),
      );
    },
    [onRulesChange],
  );

  const updateRulePort = useCallback(
    (id: string, port: string) => {
      onRulesChange((currentRules) =>
        currentRules.map((rule) => (rule.id === id ? { ...rule, port } : rule)),
      );
    },
    [onRulesChange],
  );

  const updateRuleProtocol = useCallback(
    (id: string, protocol: PortRule["protocol"]) => {
      onRulesChange((currentRules) =>
        currentRules.map((rule) =>
          rule.id === id ? { ...rule, protocol } : rule,
        ),
      );
    },
    [onRulesChange],
  );

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
            {rules.map((rule) => (
              <FirewallRuleRow
                key={rule.id}
                rule={rule}
                onPortChange={updateRulePort}
                onProtocolChange={updateRuleProtocol}
                onRemoveRule={removeRule}
              />
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

export default memo(NetworkFirewallCard);
