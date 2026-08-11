import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";

import type { ComposerTag, Project } from "./types";

type ProjectMention = { start: number; end: number; query: string };

function getProjectMention(
  message: string,
  cursor: number,
): ProjectMention | null {
  const match = message.slice(0, cursor).match(/(?:^|[\s([{])@([^\s@\n]*)$/);
  if (!match) return null;

  const query = match[1] ?? "";
  return { start: cursor - query.length - 1, end: cursor, query };
}

function hasProjectMention(message: string, projectName: string) {
  const escaped = projectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s([{])@${escaped}(?=$|[\\s.,!?;:)\\]}])`, "i").test(
    message,
  );
}

function serializeMessage(message: string, tags: ComposerTag[]) {
  let serialized = message;
  [...tags]
    .sort((left, right) => right.data.name.length - left.data.name.length)
    .forEach((tag, index) => {
      const escaped = tag.data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      serialized = serialized.replace(
        new RegExp(`(^|[\\s([{])@${escaped}(?=$|[\\s.,!?;:)\\]}])`, "gi"),
        `$1@{{${tags.indexOf(tag) + 1}}}`,
      );
    });
  return serialized.trim();
}

type WorkComposerProps = {
  colors: AppColors;
  projects: Project[];
  isConnected: boolean;
  isSubmitting?: boolean;
  compact?: boolean;
  placeholder?: string;
  showHeading?: boolean;
  showConnectionStatus?: boolean;
  onSubmit: (payload: { message: string; tagged: ComposerTag[] }) => boolean;
};

export function WorkComposer({
  colors,
  projects,
  isConnected,
  isSubmitting = false,
  compact = false,
  placeholder = "Type @ to tag a project",
  showHeading = true,
  showConnectionStatus = true,
  onSubmit,
}: WorkComposerProps) {
  const inputRef = useRef<TextInput>(null);
  const cursorRef = useRef(0);
  const [message, setMessage] = useState("");
  const [mention, setMention] = useState<ProjectMention | null>(null);
  const [tagged, setTagged] = useState<ComposerTag[]>([]);

  const matchingProjects = useMemo(() => {
    if (!mention) return [];
    const query = mention.query.trim().toLocaleLowerCase();
    return projects
      .filter((project) => project.name.toLocaleLowerCase().includes(query))
      .slice(0, 6);
  }, [mention, projects]);

  const updateMessage = (value: string) => {
    setMessage(value);
    setTagged((current) =>
      current.filter((tag) => hasProjectMention(value, tag.data.name)),
    );
    setMention(
      getProjectMention(value, Math.min(cursorRef.current, value.length)),
    );
  };

  const insertProject = (project: Project) => {
    if (!mention) return;
    const mentionText = `@${project.name}`;
    const trailing = message.slice(mention.end);
    const separator = /^\s/.test(trailing) ? "" : " ";
    const next = `${message.slice(0, mention.start)}${mentionText}${separator}${trailing}`;
    const cursor = mention.start + mentionText.length + separator.length;

    setMessage(next);
    setTagged((current) => {
      const nextTag: ComposerTag = {
        type: "project",
        data: { id: project.id, name: project.name },
      };
      const withoutDuplicate = current.filter(
        (tag) => tag.data.id !== project.id && tag.data.name !== project.name,
      );
      return [...withoutDuplicate, nextTag];
    });
    setMention(null);
    cursorRef.current = cursor;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelection(cursor, cursor);
    });
  };

  const removeTag = (tag: ComposerTag) => {
    const escaped = tag.data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    setMessage((current) =>
      current
        .replace(
          new RegExp(`(^|[\\s([{])@${escaped}(?=$|[\\s.,!?;:)\\]}])`, "i"),
          "$1",
        )
        .replace(/ {2,}/g, " ")
        .trimStart(),
    );
    setTagged((current) =>
      current.filter((item) => item.data.id !== tag.data.id),
    );
  };

  const submit = () => {
    if (!message.trim() || !isConnected || isSubmitting) return;
    const didSubmit = onSubmit({
      message: serializeMessage(message, tagged),
      tagged,
    });
    if (!didSubmit) return;
    Keyboard.dismiss();
    setMessage("");
    setTagged([]);
    setMention(null);
  };

  return (
    <View>
      {showHeading ? (
        <Text style={[styles.heading, { color: colors.text }]}> 
          What&apos;s on your mind?
        </Text>
      ) : null}
      <View
        style={[
          styles.composer,
          compact && styles.compactComposer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {tagged.length > 0 ? (
          <View style={styles.chipRow}>
            {tagged.map((tag) => (
              <Pressable
                accessibilityLabel={`Remove ${tag.data.name}`}
                accessibilityRole="button"
                key={tag.data.id}
                onPress={() => removeTag(tag)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.backgroundElement },
                ]}
              >
                <AppIcon
                  name={{ ios: "folder", android: "folder", web: "folder" }}
                  size={13}
                  tintColor={colors.brand}
                />
                <Text style={[styles.chipText, { color: colors.text }]}>
                  @{tag.data.name}
                </Text>
                <AppIcon
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  size={12}
                  tintColor={colors.textSecondary}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        <TextInput
          ref={inputRef}
          accessibilityLabel="Write an AI message"
          multiline
          onChangeText={updateMessage}
          onSelectionChange={({ nativeEvent }) => {
            cursorRef.current = nativeEvent.selection.start;
            setMention(getProjectMention(message, nativeEvent.selection.start));
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.brand}
          style={[styles.input, compact && styles.compactInput, { color: colors.text }]}
          textAlignVertical="top"
          value={message}
        />

        <View
          style={[
            styles.composerFooter,
            !showConnectionStatus && styles.composerFooterEnd,
          ]}
        >
          {showConnectionStatus ? (
            <View style={styles.connectionRow}>
              <View
                style={[
                  styles.connectionDot,
                  {
                    backgroundColor: isConnected
                      ? colors.success
                      : colors.textSecondary,
                  },
                ]}
              />
              <Text
                style={[styles.connectionText, { color: colors.textSecondary }]}
              >
                {isConnected ? "Ready" : "Chat service offline"}
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            disabled={!message.trim() || !isConnected || isSubmitting}
            onPress={submit}
            style={({ pressed }) => [
              styles.sendButton,
              compact && styles.compactSendButton,
              { backgroundColor: colors.primary },
              (!message.trim() || !isConnected || isSubmitting) &&
                styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                color={colors.primaryForeground}
                size="small"
              />
            ) : (
              <AppIcon
                name={{
                  ios: "arrow.up",
                  android: "arrow_upward",
                  web: "arrow_upward",
                }}
                size={23}
                tintColor={colors.primaryForeground}
                weight="bold"
              />
            )}
          </Pressable>
        </View>
      </View>

      {mention ? (
        <View
          accessibilityLabel="Project suggestions"
          style={[
            styles.suggestions,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {matchingProjects.length > 0 ? (
            matchingProjects.map((project) => (
              <Pressable
                accessibilityRole="button"
                key={project.id}
                onPress={() => insertProject(project)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  pressed && { backgroundColor: colors.backgroundElement },
                ]}
              >
                <View
                  style={[
                    styles.suggestionIcon,
                    { backgroundColor: colors.backgroundElement },
                  ]}
                >
                  <AppIcon
                    name={{ ios: "folder", android: "folder", web: "folder" }}
                    tintColor={colors.text}
                    size={18}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.suggestionText, { color: colors.text }]}
                >
                  @{project.name}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={[styles.noMatches, { color: colors.textSecondary }]}>
              {projects.length === 0
                ? "Create a project to tag it here."
                : `No projects match “${mention.query.trim()}”.`}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 30,
    fontWeight: "600",
    letterSpacing: -1.1,
    lineHeight: 37,
    marginBottom: Spacing.six,
    textAlign: "center",
  },
  composer: {
    borderRadius: Radius.composer,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
    minHeight: 190,
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.six,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  compactComposer: {
    borderRadius: Radius.large,
    minHeight: 112,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  chip: {
    alignItems: "center",
    borderRadius: Radius.pill,
    flexDirection: "row",
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 9,
  },
  chipText: { fontSize: 12, fontWeight: "600", maxWidth: 180 },
  input: { flex: 1, fontSize: 17, lineHeight: 25, minHeight: 88, padding: 0 },
  compactInput: { fontSize: 15, lineHeight: 22, minHeight: 48, maxHeight: 120 },
  composerFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: Spacing.four,
    paddingTop: Spacing.three,
  },
  composerFooterEnd: { justifyContent: "flex-end" },
  connectionRow: { alignItems: "center", flexDirection: "row" },
  connectionDot: { borderRadius: 4, height: 6, width: 6 },
  connectionText: { fontSize: 12 },
  sendButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  compactSendButton: { height: 42, width: 42 },
  disabled: { opacity: 0.28 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  suggestions: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  suggestionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: TouchTarget + 10,
    paddingHorizontal: Spacing.three,
  },
  suggestionIcon: {
    alignItems: "center",
    borderRadius: Radius.small,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  suggestionText: { flex: 1, fontSize: 14, fontWeight: "600" },
  noMatches: {
    fontSize: 13,
    lineHeight: 20,
    padding: Spacing.five,
    textAlign: "center",
  },
});
