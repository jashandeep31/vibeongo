"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { Eye, EyeOff, ShieldCheck, ShieldX } from "lucide-react";

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
  const hasValue = (() => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return false;

    try {
      const parsedValue: unknown = JSON.parse(trimmedValue);
      return !(
        parsedValue !== null &&
        typeof parsedValue === "object" &&
        !Array.isArray(parsedValue) &&
        Object.keys(parsedValue).length === 0
      );
    } catch {
      return true;
    }
  })();

  return (
    <div className="max-w-full min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor={id} className="text-sm">
            Auth JSON
          </Label>
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              hasValue ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {hasValue ? (
              <ShieldCheck className="size-3.5" />
            ) : (
              <ShieldX className="size-3.5" />
            )}
            {hasValue ? "Configured" : "Not configured"}
          </span>
        </div>
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
          {isRevealed ? "Hide" : "Edit"}
        </Button>
      </div>

      {isRevealed ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder='{"token": "xyz..."}'
          aria-label={`${serviceName} auth JSON`}
          wrap="soft"
          className="min-h-24 max-w-full min-w-0 overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap"
        />
      ) : null}
    </div>
  );
}
