import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { DEFAULT_MODELS, type DefaultModel } from "@/constants/models";
import { useTheme } from "@/hooks/use-theme";

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

// Model ID field that suggests known models while focused. Picking one is
// optional: whatever the user types is kept as a custom model ID.
export function ModelInput({
  editable = true,
  onChangeText,
  style,
  value,
}: {
  editable?: boolean;
  onChangeText: (value: string) => void;
  style?: TextInputProps["style"];
  value: string;
}) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const query = value.trim().toLowerCase();
  // An exact match means a model was just picked; show the full list again.
  const isExactMatch = DEFAULT_MODELS.some((model) => model.id === value);
  const models =
    !query || isExactMatch
      ? DEFAULT_MODELS
      : filterModels(DEFAULT_MODELS, query);

  return (
    <View style={styles.wrap}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholder="Enter or pick a model ID"
        placeholderTextColor={theme.textSecondary}
        ref={inputRef}
        spellCheck={false}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: isFocused ? theme.text : theme.backgroundSelected,
            color: theme.text,
          },
          style,
        ]}
        value={value}
      />
      {isFocused && editable ? (
        <View
          style={[
            styles.suggestions,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          {models.length ? (
            models.map((model, index) => {
              const selected = model.id === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={model.id}
                  onPress={() => {
                    onChangeText(model.id);
                    inputRef.current?.blur();
                  }}
                  style={({ pressed }) => [
                    styles.suggestion,
                    index > 0 && {
                      borderTopColor: theme.backgroundSelected,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText numberOfLines={1} style={styles.modelId}>
                    {model.id}
                  </ThemedText>
                  {selected ? (
                    <SymbolView
                      name={{ ios: "checkmark", android: "check" }}
                      size={14}
                      tintColor={theme.text}
                    />
                  ) : (
                    <ThemedText
                      style={styles.provider}
                      themeColor="textSecondary"
                    >
                      {model.provider}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })
          ) : (
            <ThemedText style={styles.custom} themeColor="textSecondary">
              No suggested match. “{value.trim()}” will be used as a custom
              model.
            </ThemedText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  suggestions: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  suggestion: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  modelId: { flex: 1, fontSize: 14 },
  provider: { fontSize: 12 },
  custom: { fontSize: 13, lineHeight: 18, padding: 13 },
});
