import {
  filterOpencodeCommands,
  getActiveOpencodeSlashCommand,
  type OpencodeCommand,
  type OpencodeFileReference,
  type OpencodeInventory,
  type OpencodePromptSelection,
  type UploadAttachment,
} from "@repo/api-client";
import { useVoiceTranscription } from "@/components/projects/use-voice-transcription";
import { VoiceWaveform } from "@/components/projects/voice-waveform";
import { BlurTargetView, BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  OpencodeProviderConnectSheet,
  type OpencodeProviderConnection,
} from "@/components/projects/opencode-provider-connect-sheet";
import { Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

type PickerKind = "provider" | "model" | "agent" | "variant";
type PickerOption = { id: string; title: string; subtitle?: string };
// App-side slash commands; they run here instead of being sent to OpenCode.
export type OpencodeComposerAction = {
  name: string;
  description: string;
  run: () => void;
};
type ComposerCommand = OpencodeCommand & { run?: () => void };
const CONNECT_PROVIDER_OPTION = "__connect_provider__";
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getActiveFileMention(value: string, cursor: number) {
  const match = value.slice(0, cursor).match(/(?:^|\s)@([^\s@]*)$/);
  if (!match) return null;
  const query = match[1] ?? "";
  return { end: cursor, query, start: cursor - query.length - 1 };
}

function formatRecordingTime(durationMillis: number) {
  const seconds = Math.floor(durationMillis / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export type ComposerAttachment = UploadAttachment & {
  id: string;
  uri: string;
};

type OpencodeComposerProps = {
  accessibilityLabel: string;
  actions?: OpencodeComposerAction[];
  attachments?: ComposerAttachment[];
  autoFocus?: boolean;
  commands?: OpencodeCommand[];
  disabled?: boolean;
  submitDisabled?: boolean;
  inventory?: OpencodeInventory;
  isStopping?: boolean;
  isSubmitting?: boolean;
  fileReferences?: OpencodeFileReference[];
  onChangeSelection: (selection: OpencodePromptSelection) => void;
  onChangeAttachments?: (attachments: ComposerAttachment[]) => void;
  onChangeFileReferences?: (references: OpencodeFileReference[]) => void;
  onChangeText: (value: string) => void;
  onNewChat?: () => void;
  onOpenChats?: () => void;
  onOpenTerminal?: () => void;
  onOpenWorktrees?: () => void;
  onStop?: () => void;
  providerConnection?: OpencodeProviderConnection;
  searchFiles?: (query: string) => Promise<string[]>;
  onSubmit: () => void;
  placeholder: string;
  selection: OpencodePromptSelection;
  value: string;
};

export type ComposerDraft = {
  attachments: ComposerAttachment[];
  fileReferences: OpencodeFileReference[];
  text: string;
};

type OpencodeComposerControllerProps = Omit<
  OpencodeComposerProps,
  | "attachments"
  | "fileReferences"
  | "onChangeAttachments"
  | "onChangeFileReferences"
  | "onChangeText"
  | "onSubmit"
  | "value"
> & {
  onSubmit: (draft: ComposerDraft, restore: () => void) => void;
};

function OpencodeComposerControllerComponent({
  onSubmit,
  ...props
}: OpencodeComposerControllerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [fileReferences, setFileReferences] = useState<OpencodeFileReference[]>(
    [],
  );

  const submit = () => {
    const draft = { attachments, fileReferences, text: text.trim() };
    setText("");
    setAttachments([]);
    setFileReferences([]);
    onSubmit(draft, () => {
      setText(draft.text);
      setAttachments(draft.attachments);
      setFileReferences(draft.fileReferences);
    });
  };

  return (
    <OpencodeComposer
      {...props}
      attachments={attachments}
      fileReferences={fileReferences}
      onChangeAttachments={setAttachments}
      onChangeFileReferences={setFileReferences}
      onChangeText={setText}
      onSubmit={submit}
      value={text}
    />
  );
}

export const OpencodeComposerController = memo(
  OpencodeComposerControllerComponent,
);

export function OpencodeComposer({
  accessibilityLabel,
  actions,
  attachments = [],
  autoFocus,
  commands,
  disabled,
  fileReferences = [],
  inventory,
  isStopping,
  isSubmitting,
  onChangeSelection,
  onChangeAttachments,
  onChangeFileReferences,
  onChangeText,
  onNewChat,
  onOpenChats,
  onOpenTerminal,
  onOpenWorktrees,
  onStop,
  providerConnection,
  searchFiles,
  onSubmit,
  placeholder,
  selection,
  submitDisabled: submitDisabledProp,
  value,
}: OpencodeComposerProps) {
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";
  const inputRef = useRef<TextInput>(null);
  const restoreInputFocusAfterRecordingRef = useRef(false);
  const voice = useVoiceTranscription(value, onChangeText);
  const blurTargetRef = useRef<View>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [promptHeight, setPromptHeight] = useState(50);
  const [selectionEnd, setSelectionEnd] = useState(value.length);
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [isSearchingFiles, setIsSearchingFiles] = useState(false);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const activeFileMention = getActiveFileMention(value, selectionEnd);
  const activeSlashCommand = getActiveOpencodeSlashCommand(value, selectionEnd);
  const hasModelPicker = !!(inventory?.models.length || providerConnection);
  const hasAgentPicker = !!inventory?.agents.length;
  const availableCommands = useMemo(() => {
    const serverCommands: ComposerCommand[] = commands ?? [];
    const localCommands: ComposerCommand[] = [
      ...(onNewChat
        ? [{ name: "new", description: "Start a new chat", run: onNewChat }]
        : []),
      ...(hasModelPicker
        ? [
            {
              name: "models",
              description: "Choose a model",
              run: () => {
                Keyboard.dismiss();
                setPicker("provider");
              },
            },
          ]
        : []),
      ...(hasAgentPicker
        ? [
            {
              name: "agents",
              description: "Choose an agent",
              run: () => {
                Keyboard.dismiss();
                setPicker("agent");
              },
            },
          ]
        : []),
      ...(onOpenTerminal
        ? [
            {
              name: "terminal",
              description: "Open the terminal",
              run: onOpenTerminal,
            },
          ]
        : []),
      ...(actions ?? []),
    ];
    return [
      ...serverCommands,
      ...localCommands.filter(
        (local) =>
          !serverCommands.some((command) => command.name === local.name),
      ),
    ];
  }, [
    actions,
    commands,
    hasAgentPicker,
    hasModelPicker,
    onNewChat,
    onOpenTerminal,
  ]);
  const activeCommandQuery = activeSlashCommand?.query;
  const commandSuggestions = useMemo(
    () =>
      activeCommandQuery === undefined
        ? []
        : filterOpencodeCommands(availableCommands, activeCommandQuery),
    [activeCommandQuery, availableCommands],
  );
  const isVoiceActive = voice.state !== "idle";
  // Voice input swaps the text field for a recording bar, which uses the
  // single-row layout.
  const isExpanded = (isFocused || value.length > 0) && !isVoiceActive;
  const isRecording = voice.state === "recording";
  const [recordingProgress] = useState(() => new Animated.Value(0));
  const submitDisabled =
    disabled ||
    submitDisabledProp ||
    isSubmitting ||
    voice.state !== "idle" ||
    (!value.trim() && attachments.length === 0);
  const submit = () => {
    if (submitDisabled) return;
    onSubmit();
  };

  useEffect(() => {
    // Background color can't use the native driver, so the icon swap shares
    // the JS-driven value to stay in sync with it.
    const animation = Animated.timing(recordingProgress, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
      toValue: isRecording ? 1 : 0,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isRecording, recordingProgress]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = Keyboard.addListener("keyboardDidHide", () => {
      if (inputRef.current?.isFocused()) inputRef.current.blur();
      setIsFocused(false);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (voice.state !== "recording" || !restoreInputFocusAfterRecordingRef.current)
      return;
    restoreInputFocusAfterRecordingRef.current = false;
    inputRef.current?.focus();
  }, [voice.state]);
  const pickFiles = async () => {
    if (!onChangeAttachments || attachments.length >= MAX_ATTACHMENTS) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        base64: Platform.OS === "web",
        copyToCacheDirectory: true,
        multiple: true,
        type: "*/*",
      });
      if (result.canceled) return;

      const selected: ComposerAttachment[] = [];
      const rejected: string[] = [];
      for (const [index, asset] of result.assets.entries()) {
        try {
          if (selected.length + attachments.length >= MAX_ATTACHMENTS) {
            rejected.push(asset.name);
            continue;
          }
          const file =
            Platform.OS === "web" && asset.file
              ? asset.file
              : new ExpoFile(asset.uri);
          const size = asset.size ?? file.size;
          if (size > MAX_ATTACHMENT_BYTES) {
            rejected.push(asset.name);
            continue;
          }
          const extension = asset.name.split(".").at(-1)?.toLowerCase() ?? "";
          const bytes = new Uint8Array(await file.arrayBuffer());
          const imageMime = IMAGE_MIME_BY_EXTENSION[extension];
          const isImage = !!imageMime;
          const isPdf =
            bytes.length >= 5 &&
            bytes[0] === 0x25 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x44 &&
            bytes[3] === 0x46 &&
            bytes[4] === 0x2d;
          let isText = false;
          if (!isImage && !isPdf) {
            try {
              const content = new TextDecoder("utf-8", { fatal: true }).decode(
                bytes,
              );
              isText = !/\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(
                content,
              );
            } catch {
              // Binary files are staged on the OpenCode server for the agent's tools.
            }
          }
          const mimeType =
            imageMime ??
            (isPdf
              ? "application/pdf"
              : isText
                ? "text/plain"
                : "application/octet-stream");
          const base64 =
            Platform.OS === "web" && asset.base64
              ? asset.base64.split(",")[1]
              : await new ExpoFile(asset.uri).base64();
          if (!base64) {
            rejected.push(asset.name);
            continue;
          }
          selected.push({
            id: `${Date.now()}-${index}-${asset.name}`,
            uri: asset.uri,
            type: isImage
              ? "image"
              : isPdf
                ? "pdf"
                : isText
                  ? "text"
                  : "file",
            name: asset.name,
            mimeType,
            sizeBytes: size,
            dataUrl: `data:${mimeType};base64,${base64}`,
          });
        } catch {
          rejected.push(asset.name);
        }
      }
      if (selected.length) onChangeAttachments([...attachments, ...selected]);
      if (rejected.length) {
        Alert.alert(
          "Some files were not attached",
          "Attachments must be 20 MiB or smaller, with up to five per prompt.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Could not attach files",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  useEffect(() => {
    if (!searchFiles || !activeFileMention) {
      setFileSuggestions([]);
      setIsSearchingFiles(false);
      return;
    }

    let active = true;
    setIsSearchingFiles(true);
    const timeout = setTimeout(() => {
      void searchFiles(activeFileMention.query)
        .then((paths) => {
          if (active) setFileSuggestions(paths);
        })
        .catch(() => {
          if (active) setFileSuggestions([]);
        })
        .finally(() => {
          if (active) setIsSearchingFiles(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [activeFileMention?.query, searchFiles]);

  const changeText = (nextValue: string) => {
    setSelectionEnd((currentCursor) => {
      if (currentCursor === value.length) return nextValue.length;

      const lengthDelta = nextValue.length - value.length;
      return Math.max(
        0,
        Math.min(nextValue.length, currentCursor + lengthDelta),
      );
    });
    onChangeText(nextValue);
    onChangeFileReferences?.(
      fileReferences.filter((reference) =>
        nextValue.includes(reference.mention),
      ),
    );
  };

  const chooseCommand = (command: ComposerCommand) => {
    if (!activeSlashCommand) return;
    if (command.run) {
      // Local commands act on the composer instead of being sent.
      const nextValue = value.slice(activeSlashCommand.end).trimStart();
      onChangeText(nextValue);
      setSelectionEnd(0);
      command.run();
      return;
    }
    const token = `/${command.name} `;
    const rest = value.slice(activeSlashCommand.end).replace(/^\s+/, "");
    onChangeText(`${token}${rest}`);
    setSelectionEnd(token.length);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const chooseFile = (path: string) => {
    if (!activeFileMention) return;
    const mention = `@${path}`;
    const nextValue = `${value.slice(0, activeFileMention.start)}${mention} ${value.slice(activeFileMention.end)}`;
    const nextCursor = activeFileMention.start + mention.length + 1;
    onChangeText(nextValue);
    onChangeFileReferences?.([
      ...fileReferences.filter((reference) => reference.path !== path),
      { mention, path },
    ]);
    setSelectionEnd(nextCursor);
    setFileSuggestions([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const attachmentControl = onChangeAttachments ? (
    <Pressable
      accessibilityLabel="Add attachment"
      accessibilityRole="button"
      disabled={attachments.length >= MAX_ATTACHMENTS}
      onPress={() => void pickFiles()}
      style={({ pressed }) => [
        styles.attachmentButton,
        attachments.length >= MAX_ATTACHMENTS && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "plus", android: "add" }}
        size={23}
        tintColor={theme.text}
      />
    </Pressable>
  ) : null;

  const cancelVoiceControl = (
    <Pressable
      accessibilityLabel="Cancel voice input"
      accessibilityRole="button"
      disabled={voice.state === "canceling"}
      onPress={() => void voice.cancel()}
      style={({ pressed }) => [
        styles.attachmentButton,
        voice.state === "canceling" && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "xmark", android: "close" }}
        size={18}
        tintColor={theme.text}
      />
    </Pressable>
  );

  const recordingStatus = (
    <View
      accessibilityLiveRegion="polite"
      style={styles.recordingStatus}
    >
      {isRecording ? (
        <VoiceWaveform color="#dc2626" meter={voice.meter} />
      ) : (
        <ThemedText
          numberOfLines={1}
          style={styles.recordingLabel}
          themeColor="textSecondary"
        >
          {voice.state === "starting"
            ? "Starting…"
            : voice.state === "canceling"
              ? "Canceling…"
              : voice.state === "error"
                ? "Couldn't transcribe"
                : "Transcribing…"}
        </ThemedText>
      )}
      {isRecording ? (
        <ThemedText style={styles.recordingTime} themeColor="textSecondary">
          {formatRecordingTime(voice.durationMillis)}
        </ThemedText>
      ) : null}
    </View>
  );

  const actionControls = (
    <View style={styles.actionControls}>
      {Platform.OS !== "web" ? (
        <Pressable
          accessibilityLabel={
            voice.state === "recording"
              ? "Finish recording"
              : voice.state === "error"
                ? "Retry transcription"
                : "Record voice prompt"
          }
          accessibilityRole="button"
          focusable={false}
          disabled={
            (disabled && voice.state === "idle") ||
            (voice.state !== "idle" &&
              voice.state !== "recording" &&
              voice.state !== "error")
          }
          onPressIn={() => {
            if (voice.state === "idle") {
              restoreInputFocusAfterRecordingRef.current =
                (inputRef.current?.isFocused() ?? false) || isFocused;
            }
          }}
          onPress={() =>
            void (voice.state === "recording"
              ? voice.stop()
              : voice.state === "error"
                ? voice.retry()
                : voice.start())
          }
          style={({ pressed }) => [
            styles.voiceButton,
            ((disabled && voice.state === "idle") ||
              (voice.state !== "idle" &&
                voice.state !== "recording" &&
                voice.state !== "error")) &&
              styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.voiceButtonFill,
              {
                backgroundColor: recordingProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["rgba(220, 38, 38, 0)", "rgba(220, 38, 38, 1)"],
                }),
              },
            ]}
          />
          {voice.state === "starting" ||
          voice.state === "stopping" ||
          voice.state === "canceling" ||
          voice.state === "transcribing" ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <>
              <Animated.View
                style={[
                  styles.voiceIcon,
                  {
                    opacity: recordingProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                    transform: [
                      {
                        scale: recordingProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.5],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <SymbolView
                  name={
                    voice.state === "error"
                      ? { ios: "arrow.clockwise", android: "refresh" }
                      : { ios: "mic.fill", android: "mic" }
                  }
                  size={20}
                  tintColor={theme.text}
                />
              </Animated.View>
              <Animated.View
                style={[
                  styles.voiceIcon,
                  {
                    opacity: recordingProgress,
                    transform: [
                      {
                        scale: recordingProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: "stop.fill", android: "stop" }}
                  size={17}
                  tintColor="#ffffff"
                />
              </Animated.View>
            </>
          )}
        </Pressable>
      ) : null}
      {/* Hidden during voice input so it isn't confused with the mic's ■. */}
      {onStop && !isVoiceActive ? (
        <Pressable
          accessibilityLabel="Stop response"
          accessibilityRole="button"
          disabled={isStopping}
          onPress={onStop}
          style={({ pressed }) => [
            styles.sendButton,
            styles.stopButton,
            isStopping && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {isStopping ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <SymbolView
              name={{ ios: "stop.fill", android: "stop" }}
              size={17}
              tintColor="#ffffff"
            />
          )}
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel={onStop ? "Queue task" : "Send prompt"}
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
  );

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
              {attachment.type === "image" ? (
                <Image
                  accessibilityLabel={attachment.name}
                  contentFit="cover"
                  source={{ uri: attachment.uri }}
                  style={styles.previewImage}
                />
              ) : (
                <View
                  style={[
                    styles.previewFile,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: "doc.text", android: "description" }}
                    size={20}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText
                    ellipsizeMode="middle"
                    numberOfLines={2}
                    style={styles.previewFileName}
                  >
                    {attachment.name}
                  </ThemedText>
                </View>
              )}
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
      <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
        <PromptSelectors
          disabled={disabled}
          inventory={inventory}
          onChange={onChangeSelection}
          onNewChat={onNewChat}
          onOpenChats={onOpenChats}
          onOpenTerminal={onOpenTerminal}
          onOpenWorktrees={onOpenWorktrees}
          picker={picker}
          providerConnection={providerConnection}
          selection={selection}
          setPicker={setPicker}
        />
      </BlurTargetView>
      {commandSuggestions.length || (activeFileMention && searchFiles) ? (
        <View
          style={[
            styles.fileSuggestions,
            { borderColor: theme.backgroundSelected, bottom: promptHeight + 8 },
          ]}
        >
          <BlurView
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={blurTargetRef}
            blurReductionFactor={2}
            intensity={70}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            tint={
              isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"
            }
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(36,37,40,0.72)"
                  : "rgba(255,255,255,0.72)",
              },
            ]}
          />
          {commandSuggestions.length ? (
            <FlatList
              data={commandSuggestions}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(command) => command.name}
              renderItem={({ item: command }) => (
                <Pressable
                  accessibilityLabel={`Use /${command.name} command`}
                  accessibilityRole="button"
                  onPress={() => chooseCommand(command)}
                  style={({ pressed }) => [
                    styles.fileSuggestion,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.commandName}>
                    /{command.name}
                  </ThemedText>
                  {command.description ? (
                    <ThemedText
                      numberOfLines={1}
                      style={styles.commandDescription}
                      themeColor="textSecondary"
                    >
                      {command.description}
                    </ThemedText>
                  ) : null}
                </Pressable>
              )}
            />
          ) : isSearchingFiles ? (
            <View style={styles.fileSuggestionState}>
              <ActivityIndicator size="small" />
              <ThemedText
                style={{ fontFamily: Fonts.mono, fontSize: 11 }}
                themeColor="textSecondary"
              >
                Searching files…
              </ThemedText>
            </View>
          ) : fileSuggestions.length ? (
            <FlatList
              data={fileSuggestions.slice(0, 4)}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(path) => path}
              renderItem={({ item: path }) => (
                <Pressable
                  accessibilityLabel={`Mention ${path}`}
                  accessibilityRole="button"
                  onPress={() => chooseFile(path)}
                  style={({ pressed }) => [
                    styles.fileSuggestion,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{ ios: "doc", android: "description" }}
                    size={14}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText
                    ellipsizeMode="head"
                    numberOfLines={1}
                    style={styles.fileSuggestionPath}
                  >
                    {path}
                  </ThemedText>
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.fileSuggestionState}>
              <ThemedText themeColor="textSecondary">
                No files found.
              </ThemedText>
            </View>
          )}
        </View>
      ) : null}
      <View
        style={styles.promptRow}
        onLayout={(event) => setPromptHeight(event.nativeEvent.layout.height)}
      >
        <View
          style={[
            styles.composer,
            isExpanded && styles.composerExpanded,
            {
              backgroundColor: isVoiceActive
                ? "rgba(220, 38, 38, 0.1)"
                : theme.backgroundElement,
              borderColor: isVoiceActive
                ? "rgba(220, 38, 38, 0.35)"
                : theme.backgroundSelected,
              borderRadius: isExpanded ? 24 : 999,
            },
          ]}
        >
          {isVoiceActive
            ? cancelVoiceControl
            : !isExpanded
              ? attachmentControl
              : null}
          <TextInput
            accessibilityLabel={accessibilityLabel}
            autoFocus={autoFocus}
            editable={!disabled}
            multiline
            onBlur={() => setIsFocused(false)}
            onChangeText={changeText}
            onFocus={() => setIsFocused(true)}
            onSelectionChange={(event) =>
              setSelectionEnd(event.nativeEvent.selection.end)
            }
            onSubmitEditing={submit}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            ref={inputRef}
            style={[
              styles.input,
              isExpanded ? styles.inputExpanded : styles.inputCollapsed,
              { color: theme.text },
              // Hidden but still mounted, so a focused field keeps the
              // keyboard open while recording.
              isVoiceActive && styles.inputHidden,
            ]}
            textAlignVertical={isExpanded ? "top" : "center"}
            value={value}
          />
          {isVoiceActive ? recordingStatus : null}
          {isExpanded ? (
            <View style={styles.expandedToolbar}>
              {attachmentControl}
              <View style={styles.toolbarSpacer} />
              {actionControls}
            </View>
          ) : (
            actionControls
          )}
        </View>
      </View>
    </View>
  );
}

const PromptSelectors = memo(function PromptSelectors({
  disabled,
  inventory,
  onChange,
  onNewChat,
  onOpenChats,
  onOpenTerminal,
  onOpenWorktrees,
  picker,
  providerConnection,
  selection,
  setPicker,
}: {
  disabled?: boolean;
  inventory?: OpencodeInventory;
  onChange: (selection: OpencodePromptSelection) => void;
  onNewChat?: () => void;
  onOpenChats?: () => void;
  onOpenTerminal?: () => void;
  onOpenWorktrees?: () => void;
  picker: PickerKind | null;
  providerConnection?: OpencodeProviderConnection;
  selection: OpencodePromptSelection;
  setPicker: (picker: PickerKind | null) => void;
}) {
  const theme = useTheme();
  const [providerConnectOpen, setProviderConnectOpen] = useState(false);
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
      return [
        ...providers.map((provider) => ({
          id: provider.id,
          title: provider.name,
        })),
        ...(providerConnection
          ? [
              {
                id: CONNECT_PROVIDER_OPTION,
                title: "Connect provider",
              },
            ]
          : []),
      ];
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
  }, [
    inventory,
    picker,
    providerConnection,
    providers,
    selectedModel,
    selectedProviderID,
  ]);

  const choose = (id: string) => {
    if (picker === "provider") {
      if (id === CONNECT_PROVIDER_OPTION) {
        setPicker(null);
        setProviderConnectOpen(true);
        return;
      }
      const providerModel = inventory?.models.find(
        (model) => model.providerID === id,
      );
      const currentModelIsFromProvider = selectedModel?.providerID === id;
      onChange({
        ...selection,
        model: currentModelIsFromProvider ? selection.model : providerModel?.id,
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
        style={styles.pillsScroller}
      >
        {onOpenChats ? (
          <IconPill
            disabled={disabled}
            icon={{ ios: "bubble.left.and.bubble.right", android: "forum" }}
            label="Open session chats"
            onPress={onOpenChats}
          />
        ) : null}
        <SelectorPill
          disabled={disabled || (!providers.length && !providerConnection)}
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
            selection.agent ??
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
        {onOpenTerminal ? (
          <SelectorPill
            disabled={disabled}
            icon={{ ios: "apple.terminal", android: "terminal" }}
            label="Terminal"
            onPress={onOpenTerminal}
            showChevron={false}
          />
        ) : null}
        {onOpenWorktrees ? (
          <SelectorPill
            disabled={disabled}
            icon={{ ios: "arrow.triangle.branch", android: "account_tree" }}
            label="Worktree"
            onPress={onOpenWorktrees}
            showChevron={false}
          />
        ) : null}
      </ScrollView>
      <SelectionSheet
        onBack={picker === "model" ? () => setPicker("provider") : undefined}
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
      {providerConnection ? (
        <OpencodeProviderConnectSheet
          connection={providerConnection}
          onClose={() => setProviderConnectOpen(false)}
          visible={providerConnectOpen}
        />
      ) : null}
    </>
  );
});

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

function IconPill({
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
        styles.iconPill,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView name={icon} size={16} tintColor={theme.textSecondary} />
    </Pressable>
  );
}

function SelectionSheet({
  onBack,
  onChoose,
  onClose,
  options,
  selectedId,
  title,
  visible,
}: {
  onBack?: () => void;
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
          {onBack ? (
            <Pressable
              accessibilityLabel="Back to providers"
              accessibilityRole="button"
              onPress={onBack}
              style={styles.closeButton}
            >
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back" }}
                size={19}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          ) : null}
          <ThemedText
            style={[styles.sheetTitle, !onBack && styles.sheetTitleWithoutBack]}
          >
            {title}
          </ThemedText>
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
  actionControls: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
  },
  voiceButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  voiceButtonFill: {
    borderRadius: 999,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  voiceIcon: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  attachmentButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  attachmentPreviews: { gap: 8, paddingHorizontal: 4 },
  attachmentPreviewScroller: {
    flexGrow: 0,
    height: 68,
    maxWidth: "100%",
    width: "100%",
  },
  blurTarget: { width: "100%" },
  commandDescription: { flex: 1, fontSize: 12 },
  commandName: { fontFamily: Fonts.mono, fontSize: 12, fontWeight: "600" },
  closeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  composer: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 52,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  composerExpanded: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 4,
    paddingBottom: 6,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  composerArea: {
    gap: 8,
    maxWidth: "100%",
    minWidth: 0,
    position: "relative",
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
  fileSuggestion: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  fileSuggestionPath: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 15,
  },
  fileSuggestions: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    left: 0,
    maxHeight: 148,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    width: "100%",
    zIndex: 20,
  },
  fileSuggestionState: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inputCollapsed: {
    height: 36,
  },
  inputHidden: {
    height: 1,
    opacity: 0,
    position: "absolute",
    width: 1,
  },
  recordingLabel: { flexShrink: 1, fontSize: 15, fontWeight: "500" },
  recordingStatus: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  recordingTime: { fontSize: 15, fontVariant: ["tabular-nums"] },
  inputExpanded: {
    flex: 0,
    maxHeight: 130,
    minHeight: 64,
    width: "100%",
  },
  expandedToolbar: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 38,
  },
  toolbarSpacer: {
    flex: 1,
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
  iconPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  pills: {
    gap: 8,
  },
  pillsScroller: {
    backgroundColor: "transparent",
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
  previewFile: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    height: 58,
    paddingHorizontal: 8,
    width: 148,
  },
  previewFileName: { flex: 1, fontSize: 11 },
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
  stopButton: {
    backgroundColor: "#dc2626",
  },
  sheet: {
    flex: 1,
  },
  sheetHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
    paddingLeft: 16,
    paddingRight: 16,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  sheetTitleWithoutBack: {
    marginLeft: 16,
  },
});
