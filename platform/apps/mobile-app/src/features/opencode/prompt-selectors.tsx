import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { Radius, Spacing, TouchTarget, type AppColors } from "@/constants/theme";

import type {
  OpencodeInventory,
  OpencodePromptSelection,
} from "./opencode-api";

type PickerKind = "model" | "agent" | "variant";
type Option = { id: string; title: string; subtitle?: string };

export function PromptSelectors({
  colors,
  disabled,
  inventory,
  selection,
  onChange,
}: {
  colors: AppColors;
  disabled?: boolean;
  inventory: OpencodeInventory | null;
  selection: OpencodePromptSelection;
  onChange: (selection: OpencodePromptSelection) => void;
}) {
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const selectedModel = inventory?.models.find(
    (model) => model.id === selection.model,
  );
  const selectedAgent = inventory?.agents.find(
    (agent) => agent.id === selection.agent,
  );
  const options = useMemo<Option[]>(() => {
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
  }, [inventory?.agents, inventory?.models, picker, selectedModel?.variants]);
  const selectedId =
    picker === "model"
      ? selection.model
      : picker === "agent"
        ? selection.agent
        : selection.variant ?? "";

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
          colors={colors}
          disabled={disabled || !inventory?.models.length}
          icon={{ ios: "brain", android: "psychology", web: "psychology" }}
          label={selectedModel?.name ?? (inventory ? "Choose model" : "Loading model…")}
          onPress={() => setPicker("model")}
        />
        <SelectorPill
          colors={colors}
          disabled={disabled || !inventory?.agents.length}
          icon={{ ios: "person.crop.circle", android: "smart_toy", web: "smart_toy" }}
          label={selectedAgent?.name ?? (inventory ? "Choose agent" : "Loading agent…")}
          onPress={() => setPicker("agent")}
        />
        <SelectorPill
          colors={colors}
          disabled={disabled || !selectedModel}
          icon={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }}
          label={selection.variant ?? "Default variant"}
          onPress={() => setPicker("variant")}
        />
      </ScrollView>
      <SelectionSheet
        colors={colors}
        onChoose={choose}
        onClose={() => setPicker(null)}
        options={options}
        selectedId={selectedId}
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
  colors,
  disabled,
  icon,
  label,
  onPress,
}: {
  colors: AppColors;
  disabled?: boolean;
  icon: Parameters<typeof AppIcon>[0]["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <AppIcon name={icon} size={15} tintColor={colors.textSecondary} />
      <Text numberOfLines={1} style={[styles.pillText, { color: colors.text }]}>{label}</Text>
      <AppIcon name={{ ios: "chevron.up.chevron.down", android: "unfold_more", web: "unfold_more" }} size={13} tintColor={colors.textSecondary} />
    </Pressable>
  );
}

function SelectionSheet({
  colors,
  onChoose,
  onClose,
  options,
  selectedId,
  title,
  visible,
}: {
  colors: AppColors;
  onChoose: (id: string) => void;
  onClose: () => void;
  options: Option[];
  selectedId?: string;
  title: string;
  visible: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = normalizedQuery
    ? options.filter((option) =>
        `${option.title} ${option.subtitle ?? ""}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
    : options;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView edges={["top", "bottom"]} style={[styles.sheet, { backgroundColor: colors.background }]}> 
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}> 
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
          <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <AppIcon name={{ ios: "xmark", android: "close", web: "close" }} size={19} tintColor={colors.textSecondary} />
          </Pressable>
        </View>
        {options.length > 8 ? (
          <TextInput
            autoFocus
            onChangeText={setQuery}
            placeholder={`Search ${title.replace("Choose ", "")}s`}
            placeholderTextColor={colors.textSecondary}
            style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            value={query}
          />
        ) : null}
        <ScrollView contentContainerStyle={styles.options} keyboardShouldPersistTaps="handled">
          {filtered.length ? filtered.map((option) => {
            const selected = option.id === selectedId;
            return (
              <Pressable key={option.id || "default"} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onChoose(option.id)} style={({ pressed }) => [styles.option, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
                  {option.subtitle ? <Text numberOfLines={2} style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{option.subtitle}</Text> : null}
                </View>
                {selected ? <AppIcon name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }} size={21} tintColor={colors.brand} /> : null}
              </Pressable>
            );
          }) : <Text style={[styles.empty, { color: colors.textSecondary }]}>No options found.</Text>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pills: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  pill: { alignItems: "center", borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, height: 38, maxWidth: 220, paddingHorizontal: Spacing.three },
  pillText: { flexShrink: 1, fontSize: 12, fontWeight: "700" },
  sheet: { flex: 1 },
  sheetHeader: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 64, paddingLeft: Spacing.five, paddingRight: Spacing.three },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  closeButton: { alignItems: "center", height: TouchTarget, justifyContent: "center", width: TouchTarget },
  search: { borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, height: TouchTarget, marginHorizontal: Spacing.four, marginTop: Spacing.four, paddingHorizontal: Spacing.four },
  options: { paddingBottom: Spacing.eight, paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  option: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 64, paddingHorizontal: Spacing.two, paddingVertical: Spacing.three },
  optionText: { flex: 1, minWidth: 0 },
  optionTitle: { fontSize: 14, fontWeight: "700" },
  optionSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  empty: { fontSize: 14, paddingVertical: Spacing.seven, textAlign: "center" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.55 },
});
