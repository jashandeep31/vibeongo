import type {
  OpencodeInventory,
  OpencodePromptSelection,
  UploadAttachment,
} from "@repo/api-client";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

type PickerKind = "provider" | "model" | "agent" | "variant";
type PickerOption = { id: string; title: string; subtitle?: string };

export type ComposerImageAttachment = UploadAttachment & {
  id: string;
  uri: string;
};

type OpencodeComposerProps = {
  accessibilityLabel: string;
  attachments?: ComposerImageAttachment[];
  autoFocus?: boolean;
  disabled?: boolean;
  submitDisabled?: boolean;
  inventory?: OpencodeInventory;
  isStopping?: boolean;
  isSubmitting?: boolean;
  onChangeSelection: (selection: OpencodePromptSelection) => void;
  onChangeAttachments?: (attachments: ComposerImageAttachment[]) => void;
  onChangeText: (value: string) => void;
  onNewChat?: () => void;
  onToggleRaw?: () => void;
  onStop?: () => void;
  onSubmit: () => void;
  placeholder: string;
  selection: OpencodePromptSelection;
  showRawResponse?: boolean;
  value: string;
};

export function OpencodeComposer({
  accessibilityLabel,
  attachments = [],
  autoFocus,
  disabled,
  inventory,
  isStopping,
  isSubmitting,
  onChangeSelection,
  onChangeAttachments,
  onChangeText,
  onNewChat,
  onToggleRaw,
  onStop,
  onSubmit,
  placeholder,
  selection,
  showRawResponse,
  submitDisabled: submitDisabledProp,
  value,
}: OpencodeComposerProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isMultiline, setIsMultiline] = useState(false);
  const submitDisabled =
    disabled ||
    submitDisabledProp ||
    isSubmitting ||
    (!value.trim() && attachments.length === 0);
  const actionDisabled = onStop ? isStopping : submitDisabled;
  const submit = () => {
    if (submitDisabled) return;
    inputRef.current?.blur();
    Keyboard.dismiss();
    onSubmit();
  };
  const pickImages = async () => {
    if (!onChangeAttachments || attachments.length >= 5) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photos permission needed",
          "Allow photo access to attach images to this chat.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        base64: true,
        mediaTypes: ["images"],
        orderedSelection: true,
        quality: 0.85,
        selectionLimit: Math.max(1, 5 - attachments.length),
      });
      if (result.canceled) return;

      const now = Date.now();
      const selected = result.assets.flatMap((asset, index) => {
        if (!asset.base64) return [];
        const mimeType = asset.mimeType?.startsWith("image/")
          ? asset.mimeType
          : "image/jpeg";
        return [
          {
            id: `${now}-${index}-${asset.assetId ?? asset.fileName ?? "image"}`,
            uri: asset.uri,
            type: "image" as const,
            name: asset.fileName ?? `image-${now}-${index + 1}.jpg`,
            mimeType,
            sizeBytes: asset.fileSize ?? 0,
            dataUrl: `data:${mimeType};base64,${asset.base64}`,
          },
        ];
      });
      if (selected.length !== result.assets.length) {
        Alert.alert("Could not attach an image", "Try selecting it again.");
      }
      onChangeAttachments([...attachments, ...selected].slice(0, 5));
    } catch (error) {
      Alert.alert(
        "Could not open photos",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  return (
    <View style={styles.composerArea}>
      {attachments.length ? (
        <ScrollView
          contentContainerStyle={styles.attachmentPreviews}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={styles.attachmentPreviewScroller}
        >
          {attachments.map((attachment) => (
            <View key={attachment.id} style={styles.previewWrap}>
              <Image
                accessibilityLabel={attachment.name}
                contentFit="cover"
                source={{ uri: attachment.uri }}
                style={styles.previewImage}
              />
              <Pressable
                accessibilityLabel={`Remove ${attachment.name}`}
                accessibilityRole="button"
                onPress={() =>
                  onChangeAttachments?.(
                    attachments.filter((item) => item.id !== attachment.id),
                  )
                }
                style={[
                  styles.removeAttachment,
                  { backgroundColor: theme.text },
                ]}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close" }}
                  size={12}
                  tintColor={theme.background}
                />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <PromptSelectors
        disabled={disabled}
        inventory={inventory}
        onChange={onChangeSelection}
        onNewChat={onNewChat}
        onToggleRaw={onToggleRaw}
        selection={selection}
        showRawResponse={showRawResponse}
      />
      <View style={styles.promptRow}>
        {onChangeAttachments ? (
          <Pressable
            accessibilityLabel="Add images"
            accessibilityRole="button"
            disabled={attachments.length >= 5}
            onPress={() => void pickImages()}
            style={({ pressed }) => [
              styles.attachmentButton,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
              attachments.length >= 5 && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "plus", android: "add" }}
              size={23}
              tintColor={theme.text}
            />
          </Pressable>
        ) : null}
        <View
          style={[
            styles.composer,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
              borderRadius: isMultiline ? 24 : 999,
            },
          ]}
        >
          <TextInput
            accessibilityLabel={accessibilityLabel}
            autoFocus={autoFocus}
            editable={!disabled}
            multiline
            onContentSizeChange={(event) =>
              setIsMultiline(event.nativeEvent.contentSize.height > 42)
            }
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
            accessibilityLabel={onStop ? "Stop response" : "Send prompt"}
            accessibilityRole="button"
            disabled={actionDisabled}
            onPress={onStop ?? submit}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: theme.text },
              actionDisabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {isSubmitting || isStopping ? (
              <ActivityIndicator color={theme.background} size="small" />
            ) : (
              <SymbolView
                name={
                  onStop
                    ? { ios: "stop.fill", android: "stop" }
                    : { ios: "arrow.up", android: "arrow_upward" }
                }
                size={17}
                tintColor={theme.background}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PromptSelectors({
  disabled,
  inventory,
  onChange,
  onNewChat,
  onToggleRaw,
  selection,
  showRawResponse,
}: {
  disabled?: boolean;
  inventory?: OpencodeInventory;
  onChange: (selection: OpencodePromptSelection) => void;
  onNewChat?: () => void;
  onToggleRaw?: () => void;
  selection: OpencodePromptSelection;
  showRawResponse?: boolean;
}) {
  const theme = useTheme();
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const selectedModel = inventory?.models.find(
    (model) => model.id === selection.model,
  );
  const providers = useMemo(() => {
    const seen = new Set<string>();
    return (inventory?.models ?? []).reduce(
      (result, model) => {
        if (seen.has(model.providerID)) return result;
        seen.add(model.providerID);
        result.push({ id: model.providerID, name: model.providerName });
        return result;
      },
      [] as Array<{ id: string; name: string }>,
    );
  }, [inventory?.models]);
  const selectedProviderID = selectedModel?.providerID;
  const selectedAgent = inventory?.agents.find(
    (agent) => agent.id === selection.agent,
  );
  const options = useMemo<PickerOption[]>(() => {
    if (picker === "provider") {
      return providers.map((provider) => ({
        id: provider.id,
        title: provider.name,
      }));
    }
    if (picker === "model") {
      return (inventory?.models ?? [])
        .filter((model) => model.providerID === selectedProviderID)
        .map((model) => ({
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
  }, [inventory, picker, providers, selectedModel, selectedProviderID]);

  const choose = (id: string) => {
    if (picker === "provider") {
      const providerModel = inventory?.models.find(
        (model) => model.providerID === id,
      );
      const currentModelIsFromProvider = selectedModel?.providerID === id;
      onChange({
        ...selection,
        model: currentModelIsFromProvider
          ? selection.model
          : providerModel?.id,
        variant: currentModelIsFromProvider ? selection.variant : undefined,
      });
      setPicker(providerModel ? "model" : null);
      return;
    } else if (picker === "model") {
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
          disabled={disabled || !providers.length}
          icon={{ ios: "brain", android: "psychology" }}
          label={
            selectedModel?.name ??
            (inventory ? "Choose model" : "Loading model…")
          }
          onPress={() => setPicker("provider")}
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
        {onNewChat ? (
          <SelectorPill
            disabled={disabled}
            icon={{ ios: "plus", android: "add" }}
            label="New chat"
            onPress={onNewChat}
            showChevron={false}
          />
        ) : null}
        {onToggleRaw ? (
          <SelectorPill
            disabled={disabled}
            icon={{ ios: "curlybraces", android: "code" }}
            label="Raw"
            onPress={onToggleRaw}
            selected={showRawResponse}
            showChevron={false}
          />
        ) : null}
      </ScrollView>
      <SelectionSheet
        onChoose={choose}
        onClose={() => setPicker(null)}
        options={options}
        selectedId={
          picker === "provider"
            ? selectedProviderID
            : picker === "model"
            ? selection.model
            : picker === "agent"
              ? selection.agent
              : (selection.variant ?? "")
        }
        title={
          picker === "provider"
            ? "Choose provider"
            : picker === "model"
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
  selected,
  showChevron = true,
}: {
  disabled?: boolean;
  icon: Parameters<typeof SymbolView>[0]["name"];
  label: string;
  onPress: () => void;
  selected?: boolean;
  showChevron?: boolean;
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
          borderColor: selected ? theme.text : theme.backgroundSelected,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView name={icon} size={15} tintColor={theme.textSecondary} />
      <ThemedText numberOfLines={1} style={styles.pillText}>
        {label}
      </ThemedText>
      {showChevron ? (
        <SymbolView
          name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
          size={13}
          tintColor={theme.textSecondary}
        />
      ) : null}
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

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? options.filter((option) =>
          `${option.title} ${option.subtitle ?? ""}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        )
      : options;
  }, [options, query]);

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
        <FlatList
          contentContainerStyle={styles.options}
          data={filtered}
          initialNumToRender={12}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(option) => option.id || "default"}
          ListEmptyComponent={
            <ThemedText style={styles.empty} themeColor="textSecondary">
              No options found.
            </ThemedText>
          }
          maxToRenderPerBatch={12}
          removeClippedSubviews
          renderItem={({ item: option }) => {
            const selected = option.id === selectedId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
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
          }}
          updateCellsBatchingPeriod={30}
          windowSize={5}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  attachmentButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  attachmentPreviews: { gap: 8, paddingHorizontal: 4 },
  attachmentPreviewScroller: {
    flexGrow: 0,
    height: 68,
    maxWidth: "100%",
    width: "100%",
  },
  closeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  composer: {
    alignItems: "flex-end",
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    minWidth: 0,
    padding: 6,
  },
  composerArea: {
    gap: 8,
    maxWidth: "100%",
    minWidth: 0,
    width: "100%",
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
    minWidth: 0,
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
  previewImage: { borderRadius: 10, height: 58, width: 58 },
  previewWrap: { paddingRight: 5, paddingTop: 5 },
  promptRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    maxWidth: "100%",
    minWidth: 0,
    width: "100%",
  },
  removeAttachment: {
    alignItems: "center",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: 20,
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
