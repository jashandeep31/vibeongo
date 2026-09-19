"use client";

import { DEFAULT_MODELS, type DefaultModel } from "@/constants/models";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/combobox";
import { useState } from "react";

export function ModelCombobox({
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
  const [search, setSearch] = useState("");
  const customValue = search.trim();
  const selectedModel = DEFAULT_MODELS.find((model) => model.id === value);
  const customSelectedModel: DefaultModel | undefined =
    value && !selectedModel ? { id: value, provider: "custom" } : undefined;
  const options = customSelectedModel
    ? [...DEFAULT_MODELS, customSelectedModel]
    : DEFAULT_MODELS;
  const hasExactMatch = options.some(
    (model) => model.id.toLowerCase() === customValue.toLowerCase(),
  );
  const customOption =
    customValue && !hasExactMatch
      ? { id: customValue, provider: "custom" }
      : undefined;
  const allOptions = customOption ? [...options, customOption] : options;
  const normalizedSearch = customValue.toLowerCase();
  const visibleOptions = allOptions.filter(
    (model) =>
      !normalizedSearch || model.id.toLowerCase().includes(normalizedSearch),
  );
  const selectedOption = allOptions.find((model) => model.id === value) ?? null;

  return (
    <Combobox<DefaultModel>
      value={selectedOption}
      onValueChange={(model) => onChange(model?.id ?? "")}
      onInputValueChange={(inputValue, details) => {
        setSearch(inputValue);
        if (details.reason === "input-change") onChange(inputValue);
      }}
      itemToStringLabel={(model) => model.id}
      itemToStringValue={(model) => model.id}
      isItemEqualToValue={(a, b) => a?.id === b?.id}
    >
      <ComboboxInput
        id={id}
        placeholder="Search or enter a model ID"
        disabled={disabled}
        showClear
      />
      <ComboboxContent>
        <ComboboxList>
          {visibleOptions.map((model) => (
            <ComboboxItem key={model.id} value={model}>
              <span className="truncate">{model.id}</span>
            </ComboboxItem>
          ))}
          <ComboboxEmpty>No matching models.</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
