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

// Letters of the query appear in the model ID in the same order, with any
// number skipped between them ("opsol" matches "openai/gpt-5.6-sol").
function matchesInOrder(text: string, query: string) {
  let index = 0;
  for (const letter of text) {
    if (letter === query[index]) index += 1;
    if (index === query.length) return true;
  }
  return !query;
}

// Models containing the query as one piece come first, then in-order matches.
function filterModels(models: readonly DefaultModel[], query: string) {
  const contained: DefaultModel[] = [];
  const inOrder: DefaultModel[] = [];
  for (const model of models) {
    const id = model.id.toLowerCase();
    if (id.includes(query)) contained.push(model);
    else if (matchesInOrder(id, query)) inOrder.push(model);
  }
  return [...contained, ...inOrder];
}

// Model ID field that suggests known models as soon as it's clicked. Picking
// one is optional: whatever the user types is kept as a custom model ID.
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
  const [search, setSearch] = useState("");
  const customValue = search.trim();
  const normalizedSearch = customValue.toLowerCase();
  const isSuggestedModel = (id: string) =>
    DEFAULT_MODELS.some((model) => model.id.toLowerCase() === id.toLowerCase());
  // One custom row: what's being typed, or a saved custom value.
  const customId =
    customValue && !isSuggestedModel(customValue)
      ? customValue
      : value && !isSuggestedModel(value)
        ? value
        : "";
  const customOption: DefaultModel | undefined = customId
    ? { id: customId, provider: "custom" }
    : undefined;
  // Text equal to a suggested model means one was picked; show every
  // suggestion again instead of filtering down to that one.
  const suggestedOptions =
    !normalizedSearch || isSuggestedModel(customValue)
      ? DEFAULT_MODELS
      : filterModels(DEFAULT_MODELS, normalizedSearch);
  const allOptions = customOption
    ? [...DEFAULT_MODELS, customOption]
    : DEFAULT_MODELS;
  const visibleOptions = customOption
    ? [...suggestedOptions, customOption]
    : suggestedOptions;
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
      // Filtering is done above; tell the combobox what's visible so its
      // empty state and highlighting match the list.
      items={allOptions}
      filteredItems={visibleOptions}
      // Typing highlights the first match so Enter picks it. Suggested models
      // come before the custom option, so a real match wins.
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder="Search or enter a model ID"
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="w-full"
        showTrigger={false}
        showClear
      />
      <ComboboxContent>
        <ComboboxList>
          {visibleOptions.map((model) => (
            <ComboboxItem key={model.id} value={model}>
              <span className="min-w-0 flex-1 truncate">{model.id}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {model === customOption && model.id !== value
                  ? "Use custom"
                  : model.provider}
              </span>
            </ComboboxItem>
          ))}
          <ComboboxEmpty>No matching models.</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
