import { SymbolView } from "expo-symbols";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native";
import { useProjectsStore } from "@repo/app-store";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type ProjectMention = {
  end: number;
  query: string;
  start: number;
};

export type VibeongoComposerTag = {
  type: "project";
  data: { id: string; name: string };
};

export type VibeongoComposerPayload = {
  message: string;
  tagged: VibeongoComposerTag[];
};

type VibeongoComposerProps = {
  autoFocus?: boolean;
  disabled?: boolean;
  isSubmitting?: boolean;
  onSubmit: (payload: VibeongoComposerPayload) => boolean | void;
  placeholder: string;
  submitDisabled?: boolean;
  variant?: "default" | "compact";
};

const MAX_MESSAGE_LENGTH = 3_000;

function getProjectMention(message: string, cursor: number) {
  const textBeforeCursor = message.slice(0, cursor);
  const match = textBeforeCursor.match(/(?:^|[\s([{])@([^\s@\n]*)$/);
  if (!match) return null;

  const query = match[1] ?? "";
  return {
    end: cursor,
    query,
    start: cursor - query.length - 1,
  } satisfies ProjectMention;
}

function hasProjectMention(message: string, projectName: string) {
  const normalizedMessage = message.toLocaleLowerCase();
  const normalizedMention = `@${projectName}`.toLocaleLowerCase();
  let index = normalizedMessage.indexOf(normalizedMention);

  while (index !== -1) {
    const mentionEnd = index + normalizedMention.length;
    const startsAtBoundary =
      index === 0 || /[\s([{]/.test(message[index - 1] ?? "");
    const endsAtBoundary =
      mentionEnd === message.length ||
      /[\s.,!?;:)\]}]/.test(message[mentionEnd] ?? "");
    if (startsAtBoundary && endsAtBoundary) return true;
    index = normalizedMessage.indexOf(normalizedMention, index + 1);
  }

  return false;
}

function serializeTaggedMessage(
  message: string,
  tagged: VibeongoComposerTag[],
) {
  let serialized = message;

  tagged
    .map((tag, index) => ({ index, tag }))
    .sort(
      (left, right) => right.tag.data.name.length - left.tag.data.name.length,
    )
    .forEach(({ index, tag }) => {
      const escapedName = tag.data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const mentionPattern = new RegExp(
        `(^|[\\s([{])@${escapedName}(?=$|[\\s.,!?;:)\\]}])`,
        "gi",
      );
      serialized = serialized.replace(
        mentionPattern,
        (_match, prefix: string) => `${prefix}@{{${index + 1}}}`,
      );
    });

  return serialized;
}

export function VibeongoComposer({
  autoFocus,
  disabled = false,
  isSubmitting = false,
  onSubmit,
  placeholder,
  submitDisabled: submitDisabledProp = false,
  variant = "default",
}: VibeongoComposerProps) {
  const theme = useTheme();
  const projects = useProjectsStore((state) => state.projects);
  const inputRef = useRef<TextInput>(null);
  const selectionEndRef = useRef(0);
  const [message, setMessage] = useState("");
  const [tagged, setTagged] = useState<VibeongoComposerTag[]>([]);
  const [projectMention, setProjectMention] = useState<ProjectMention | null>(
    null,
  );
  const matchingProjects = useMemo(() => {
    if (!projectMention) return [];
    const query = projectMention.query.trim().toLocaleLowerCase();
    return projects
      .filter((project) => project.name.toLocaleLowerCase().includes(query))
      .slice(0, 8);
  }, [projectMention, projects]);
  const submitDisabled =
    disabled || submitDisabledProp || isSubmitting || !message.trim();
  const showCount = message.length >= MAX_MESSAGE_LENGTH - 300;

  const updateMention = (value: string, cursor: number) => {
    setProjectMention(getProjectMention(value, cursor));
  };

  const handleChangeText = (value: string) => {
    setMessage(value);
    setTagged((current) =>
      current.filter((tag) => hasProjectMention(value, tag.data.name)),
    );
    const cursor =
      selectionEndRef.current >= 0 && selectionEndRef.current <= value.length
        ? selectionEndRef.current
        : value.length;
    updateMention(value, cursor === value.length - 1 ? value.length : cursor);
  };

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const cursor = event.nativeEvent.selection.end;
    selectionEndRef.current = cursor;
    updateMention(message, cursor);
  };

  const insertProjectMention = (project: (typeof projects)[number]) => {
    if (!projectMention) return;

    const mention = `@${project.name}`;
    const textAfterMention = message.slice(projectMention.end);
    const separator = /^\s/.test(textAfterMention) ? "" : " ";
    const nextMessage =
      `${message.slice(0, projectMention.start)}${mention}${separator}${textAfterMention}`.slice(
        0,
        MAX_MESSAGE_LENGTH,
      );
    const nextCursor = Math.min(
      projectMention.start + mention.length + separator.length,
      nextMessage.length,
    );

    setMessage(nextMessage);
    setTagged((current) => {
      const nextTag: VibeongoComposerTag = {
        type: "project",
        data: { id: project.id, name: project.name },
      };
      const existingIndex = current.findIndex(
        (tag) =>
          tag.data.id === project.id ||
          tag.data.name.toLocaleLowerCase() ===
            project.name.toLocaleLowerCase(),
      );
      if (existingIndex === -1) return [...current, nextTag].slice(0, 20);
      return current.map((tag, index) =>
        index === existingIndex ? nextTag : tag,
      );
    });
    setProjectMention(null);
    selectionEndRef.current = nextCursor;

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setNativeProps({
        selection: { end: nextCursor, start: nextCursor },
      });
    });
  };

  const submit = () => {
    if (submitDisabled) return;
    const trimmedMessage = message.trim();
    const activeTags = tagged.filter((tag) =>
      hasProjectMention(trimmedMessage, tag.data.name),
    );
    const submitted = onSubmit({
      message: serializeTaggedMessage(trimmedMessage, activeTags),
      tagged: activeTags,
    });
    if (submitted === false) return;

    setMessage("");
    setTagged([]);
    setProjectMention(null);
    selectionEndRef.current = 0;
  };

  return (
    <View style={styles.root}>
      {projectMention ? (
        <View
          style={[
            styles.mentionPicker,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          {matchingProjects.length ? (
            <ScrollView
              keyboardShouldPersistTaps="always"
              style={styles.mentionScroller}
            >
              {matchingProjects.map((project) => (
                <Pressable
                  accessibilityLabel={`Mention ${project.name}`}
                  accessibilityRole="button"
                  key={project.id}
                  onPress={() => insertProjectMention(project)}
                  style={({ pressed }) => [
                    styles.mentionRow,
                    pressed && {
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: "folder", android: "folder" }}
                    size={17}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText numberOfLines={1} style={styles.mentionName}>
                    {project.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ThemedText style={styles.noMatches} themeColor="textSecondary">
              No matching projects
            </ThemedText>
          )}
        </View>
      ) : null}

      <View style={styles.promptRow}>
        <View
          style={[
            styles.composer,
            variant === "default" && styles.defaultComposer,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <TextInput
            accessibilityLabel="Chat message"
            autoFocus={autoFocus}
            editable={!disabled}
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            ref={inputRef}
            style={[
              styles.input,
              variant === "default" && styles.defaultInput,
              { color: theme.text },
            ]}
            textAlignVertical="top"
            value={message}
          />
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            accessibilityState={{ disabled: submitDisabled }}
            disabled={submitDisabled}
            onPress={submit}
            style={({ pressed }) => [
              styles.sendButton,
              variant === "default" && styles.defaultSendButton,
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
      {showCount ? (
        <ThemedText style={styles.count} themeColor="textSecondary">
          {message.length}/{MAX_MESSAGE_LENGTH}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    alignItems: "flex-end",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    minWidth: 0,
    padding: 6,
  },
  count: {
    fontSize: 11,
    lineHeight: 15,
    paddingRight: 8,
    textAlign: "right",
  },
  disabled: {
    opacity: 0.35,
  },
  defaultComposer: {
    alignItems: "flex-end",
    borderRadius: 20,
    minHeight: 98,
    padding: 6,
  },
  defaultInput: {
    fontSize: 16,
    lineHeight: 23,
    minHeight: 75,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  defaultSendButton: {
    borderRadius: 20,
    height: 40,
    width: 40,
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
  mentionName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  mentionPicker: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    maxHeight: 220,
    overflow: "hidden",
  },
  mentionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  mentionScroller: {
    maxHeight: 220,
  },
  noMatches: {
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.72,
  },
  promptRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    maxWidth: "100%",
    minWidth: 0,
    width: "100%",
  },
  root: {
    gap: 8,
    maxWidth: "100%",
    minWidth: 0,
    width: "100%",
  },
  sendButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
