"use client";

import { DEFAULT_MODELS } from "@/constants/models";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

export function ModelPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const models = DEFAULT_MODELS.filter(
    (model) =>
      !normalizedSearch || model.id.toLowerCase().includes(normalizedSearch),
  );

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter a model ID"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label="Browse suggested models"
          >
            Browse
            <ChevronDown />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter suggested models"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Filter suggested models"
          />
          <div className="mt-2 max-h-64 overflow-y-auto overscroll-contain">
            {models.length ? (
              models.map((model) => {
                const selected = model.id === value;

                return (
                  <Button
                    key={model.id}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-between px-2 py-2 text-left whitespace-normal"
                    onClick={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 break-all">{model.id}</span>
                    {selected ? <Check className="shrink-0" /> : null}
                  </Button>
                );
              })
            ) : (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No suggested models found.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
