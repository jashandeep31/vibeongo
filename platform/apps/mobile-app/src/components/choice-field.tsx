import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export type Choice = { id: string; label: string };

export function ChoiceField({
  disabled = false,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (id: string) => void;
  options: Choice[];
  placeholder: string;
  value: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label} themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.choice,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText
          numberOfLines={1}
          style={styles.choiceText}
          themeColor={selected ? "text" : "textSecondary"}
        >
          {selected?.label ?? placeholder}
        </ThemedText>
        <SymbolView
          name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
          size={15}
          tintColor={theme.textSecondary}
        />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close choices"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
              },
            ]}
          >
            <ThemedText style={styles.modalTitle}>{label}</ThemedText>
            <ScrollView style={styles.modalList}>
              {options.map((option) => {
                const isSelected = option.id === value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={option.id}
                    onPress={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.modalOption,
                      isSelected && {
                        backgroundColor: theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText style={styles.modalOptionLabel}>
                      {option.label}
                    </ThemedText>
                    {isSelected ? (
                      <SymbolView
                        name={{ ios: "checkmark", android: "check" }}
                        size={17}
                        tintColor={theme.text}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "600" },
  choice: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  choiceText: { flex: 1, fontSize: 14 },
  modalRoot: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.38)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "70%",
    maxWidth: 520,
    padding: 8,
    width: "100%",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  modalList: { flexGrow: 0 },
  modalOption: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 11,
  },
  modalOptionLabel: { flex: 1, fontSize: 14 },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.65 },
});
