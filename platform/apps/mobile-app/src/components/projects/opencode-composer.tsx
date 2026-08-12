import type {
  OpencodeInventory,
  OpencodePromptSelection,
} from "@repo/api-client";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type PickerKind = "model" | "agent" | "variant";
type PickerOption = { id: string; title: string; subtitle?: string };

type OpencodeComposerProps = {
  accessibilityLabel: string;
  autoFocus?: boolean;
  disabled?: boolean;
  submitDisabled?: boolean;
  inventory?: OpencodeInventory;
  isSubmitting?: boolean;
  onChangeSelection: (selection: OpencodePromptSelection) => void;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  selection: OpencodePromptSelection;
  value: string;
};

export function OpencodeComposer({
  accessibilityLabel,
  autoFocus,
  disabled,
  inventory,
  isSubmitting,
  onChangeSelection,
  onChangeText,
  onSubmit,
  placeholder,
  selection,
  submitDisabled: submitDisabledProp,
  value,
}: OpencodeComposerProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const submitDisabled =
    disabled || submitDisabledProp || isSubmitting || !value.trim();
  const submit = () => {
    if (submitDisabled) return;
    inputRef.current?.blur();
    Keyboard.dismiss();
    onSubmit();
  };

  return (
    <View style={styles.composerArea}>
      <PromptSelectors
        disabled={disabled}
        inventory={inventory}
        onChange={onChangeSelection}
        selection={selection}
      />
      <View
        style={[
          styles.composer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={accessibilityLabel}
          autoFocus={autoFocus}
          editable={!disabled}
          multiline
          onChangeText={onChangeText}
          onSubmitEditing={submit}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          ref={inputRef}
          style={[styles.input, { color: theme.text }]}
          textAlignVertical="top"
          value={value}
        />
        <Pressable
          accessibilityLabel="Send prompt"
          accessibilityRole="button"
          disabled={submitDisabled}
          onPress={submit}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: theme.text },
            submitDisabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.background} size="small" />
          ) : (
            <SymbolView
              name={{ ios: "arrow.up", android: "arrow_upward" }}
              size={17}
              tintColor={theme.background}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function PromptSelectors({
  disabled,
  inventory,
  onChange,
  selection,
}: {
  disabled?: boolean;
  inventory?: OpencodeInventory;
  onChange: (selection: OpencodePromptSelection) => void;
  selection: OpencodePromptSelection;
}) {
  const theme = useTheme();
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const selectedModel = inventory?.models.find(
    (model) => model.id === selection.model,
  );
  const selectedAgent = inventory?.agents.find(
    (agent) => agent.id === selection.agent,
  );
  const options = useMemo<PickerOption[]>(() => {
    if (picker === "model") {
      return (inventory?.models ?? []).map((model) => ({
        id: model.id,
        title: model.name,
        subtitle: model.providerName,
      }));
    }
    if (picker === "agent") {
      return (inventory?.agents ?? []).map((agent) => ({
        id: agent.id,
        title: agent.name,
        subtitle: agent.description,
      }));
    }
    if (picker === "variant") {
      return [
        { id: "", title: "Default", subtitle: "Use the model default" },
        ...(selectedModel?.variants ?? []).map((variant) => ({
          id: variant,
          title: variant,
        })),
      ];
    }
    return [];
  }, [inventory, picker, selectedModel]);

  const choose = (id: string) => {
    if (picker === "model") {
      onChange({ ...selection, model: id, variant: undefined });
    } else if (picker === "agent") {
      onChange({ ...selection, agent: id });
    } else if (picker === "variant") {
      onChange({ ...selection, variant: id || undefined });
    }
    setPicker(null);
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.pills}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        <SelectorPill
          disabled={disabled || !inventory?.models.length}
          icon={{ ios: "brain", android: "psychology" }}
          label={
            selectedModel?.name ??
            (inventory ? "Choose model" : "Loading model…")
          }
          onPress={() => setPicker("model")}
        />
        <SelectorPill
          disabled={disabled || !inventory?.agents.length}
          icon={{ ios: "person.crop.circle", android: "smart_toy" }}
          label={
            selectedAgent?.name ??
            (inventory ? "Choose agent" : "Loading agent…")
          }
          onPress={() => setPicker("agent")}
        />
        <SelectorPill
          disabled={disabled || !selectedModel}
          icon={{ ios: "slider.horizontal.3", android: "tune" }}
          label={selection.variant ?? "Default variant"}
          onPress={() => setPicker("variant")}
        />
      </ScrollView>
      <SelectionSheet
        onChoose={choose}
        onClose={() => setPicker(null)}
        options={options}
        selectedId={
          picker === "model"
            ? selection.model
            : picker === "agent"
              ? selection.agent
              : (selection.variant ?? "")
        }
        title={
          picker === "model"
            ? "Choose model"
            : picker === "agent"
              ? "Choose agent"
              : "Choose variant"
        }
        visible={picker !== null}
      />
    </>
  );
}

function SelectorPill({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: Parameters<typeof SymbolView>[0]["name"];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView name={icon} size={15} tintColor={theme.textSecondary} />
      <ThemedText numberOfLines={1} style={styles.pillText}>
        {label}
      </ThemedText>
      <SymbolView
        name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
        size={13}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

function SelectionSheet({
  onChoose,
  onClose,
  options,
  selectedId,
  title,
  visible,
}: {
  onChoose: (id: string) => void;
  onClose: () => void;
  options: PickerOption[];
  selectedId?: string;
  title: string;
  visible: boolean;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState("");

  useEffect(() => setQuery(""), [title, visible]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = normalizedQuery
    ? options.filter((option) =>
        `${option.title} ${option.subtitle ?? ""}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
    : options;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.sheet, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.sheetHeader,
            { borderBottomColor: theme.backgroundSelected },
          ]}
        >
          <ThemedText style={styles.sheetTitle}>{title}</ThemedText>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close" }}
              size={19}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>
        {options.length > 8 ? (
          <TextInput
            autoFocus
            onChangeText={setQuery}
            placeholder={`Search ${title.replace("Choose ", "")}s`}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.search,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                color: theme.text,
              },
            ]}
            value={query}
          />
        ) : null}
        <ScrollView
          contentContainerStyle={styles.options}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length ? (
            filtered.map((option) => {
              const selected = option.id === selectedId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.id || "default"}
                  onPress={() => onChoose(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    { borderBottomColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.optionText}>
                    <ThemedText style={styles.optionTitle}>
                      {option.title}
                    </ThemedText>
                    {option.subtitle ? (
                      <ThemedText
                        numberOfLines={2}
                        style={styles.optionSubtitle}
                        themeColor="textSecondary"
                      >
                        {option.subtitle}
                      </ThemedText>
                    ) : null}
                  </View>
                  {selected ? (
                    <SymbolView
                      name={{
                        ios: "checkmark.circle.fill",
                        android: "check_circle",
                      }}
                      size={21}
                      tintColor={theme.text}
                    />
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <ThemedText style={styles.empty} themeColor="textSecondary">
              No options found.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  composer: {
    alignItems: "flex-end",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    padding: 6,
  },
  composerArea: {
    gap: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  empty: {
    fontSize: 14,
    paddingVertical: 48,
    textAlign: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 130,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  option: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  options: {
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  optionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  pill: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    height: 38,
    maxWidth: 220,
    paddingHorizontal: 14,
  },
  pills: {
    gap: 8,
  },
  pillText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
  search: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    marginHorizontal: 24,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sendButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sheet: {
    flex: 1,
  },
  sheetHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
    paddingLeft: 32,
    paddingRight: 16,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
});
