"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

interface SensitiveAuthJsonFieldProps {
  id: string;
  serviceName: string;
  value: string;
  onChange: (value: string) => void;
}

export default function SensitiveAuthJsonField({
  id,
  serviceName,
  value,
  onChange,
}: SensitiveAuthJsonFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const hasValue = value.trim().length > 0;

  return (
    <div className="grid space-y-4 overflow-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Label htmlFor={id} className="text-foreground text-sm font-semibold">
          Auth JSON Configuration
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsRevealed((current) => !current)}
        >
          {isRevealed ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {isRevealed ? "Hide auth JSON" : "Show auth JSON"}
        </Button>
      </div>

      {isRevealed ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder='{"token": "xyz..."}'
          className="min-h-25 font-mono text-sm"
        />
      ) : (
        <div
          className={`text-muted-foreground flex items-center gap-3 rounded-md border px-3 py-3 text-sm ${
            hasValue
              ? "border-border bg-muted/40"
              : "border-yellow-500/60 bg-yellow-500/10"
          }`}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            {hasValue
              ? `${serviceName} auth JSON is hidden.`
              : `${serviceName} auth JSON is not configured.`}
          </span>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Reveal this field only when you need to view or edit sensitive auth
        configuration.
      </p>
    </div>
  );
}
