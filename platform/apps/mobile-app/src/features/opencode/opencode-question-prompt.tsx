import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Radius, Spacing, type AppColors } from "@/constants/theme";

import type { OpencodePermission, OpencodeQuestion } from "./opencode-api";

export function OpencodeQuestionPrompt({
  colors,
  busy,
  request,
  onDismiss,
  onSubmit,
}: {
  colors: AppColors;
  busy: boolean;
  request: OpencodeQuestion;
  onDismiss: () => void;
  onSubmit: (answers: string[][]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[][]>(() =>
    request.questions.map(() => []),
  );
  const [custom, setCustom] = useState<string[]>(() =>
    request.questions.map(() => ""),
  );
  const optionsRef = useRef<ScrollView>(null);
  const question = request.questions[index];
  const answers = useMemo(
    () =>
      request.questions.map((_, answerIndex) => {
        const typed = custom[answerIndex]?.trim();
        if (!typed) return selected[answerIndex] ?? [];
        return request.questions[answerIndex]?.multiple
          ? [...(selected[answerIndex] ?? []), typed]
          : [typed];
      }),
    [custom, request.questions, selected],
  );
  if (!question) return null;

  const current = answers[index] ?? [];
  const choose = (label: string) =>
    setSelected((values) =>
      values.map((value, valueIndex) => {
        if (valueIndex !== index) return value;
        if (!question.multiple) return [label];
        return value.includes(label)
          ? value.filter((item) => item !== label)
          : [...value, label];
      }),
    );
  const proceed = () => {
    if (!current.length || busy) return;
    if (index < request.questions.length - 1) setIndex((value) => value + 1);
    else if (answers.every((answer) => answer.length)) onSubmit(answers);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.questionHeader}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
            OpenCode question · {index + 1} of {request.questions.length}
          </Text>
          <Text style={[styles.question, { color: colors.text }]}>
            {question.question}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {question.multiple
              ? "Select one or more answers"
              : "Select one answer"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.options}
        keyboardShouldPersistTaps="handled"
        ref={optionsRef}
        style={styles.optionScroller}
      >
        {question.options.map((option) => {
          const checked = selected[index]?.includes(option.label) ?? false;
          return (
            <Pressable
              accessibilityRole={question.multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked }}
              disabled={busy}
              key={option.label}
              onPress={() => choose(option.label)}
              style={[
                styles.option,
                { borderColor: checked ? colors.brand : colors.border },
                checked && { backgroundColor: colors.backgroundElement },
              ]}
            >
              <AppIcon
                name={
                  question.multiple
                    ? checked
                      ? {
                          ios: "checkmark.square.fill",
                          android: "check_box",
                          web: "check_box",
                        }
                      : {
                          ios: "square",
                          android: "check_box_outline_blank",
                          web: "check_box_outline_blank",
                        }
                    : checked
                      ? {
                          ios: "largecircle.fill.circle",
                          android: "radio_button_checked",
                          web: "radio_button_checked",
                        }
                      : {
                          ios: "circle",
                          android: "radio_button_unchecked",
                          web: "radio_button_unchecked",
                        }
                }
                size={16}
                tintColor={checked ? colors.brand : colors.textSecondary}
              />
              <View style={styles.optionCopy}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.optionDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {option.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        {question.custom !== false ? (
          <TextInput
            editable={!busy}
            onFocus={() =>
              requestAnimationFrame(() =>
                optionsRef.current?.scrollToEnd({ animated: true }),
              )
            }
            onChangeText={(value) =>
              setCustom((values) =>
                values.map((item, itemIndex) =>
                  itemIndex === index ? value : item,
                ),
              )
            }
            placeholder="Or type your own answer"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.customInput,
              { borderColor: colors.border, color: colors.text },
            ]}
            value={custom[index] ?? ""}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable
          disabled={busy}
          onPress={onDismiss}
          style={styles.textButton}
        >
          <Text style={[styles.dismissText, { color: colors.textSecondary }]}>
            Dismiss
          </Text>
        </Pressable>
        <View style={styles.rightActions}>
          {index > 0 ? (
            <Pressable
              disabled={busy}
              onPress={() => setIndex((value) => value - 1)}
              style={styles.textButton}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Back
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={!current.length || busy}
            onPress={proceed}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
              (!current.length || busy) && styles.disabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator
                color={colors.primaryForeground}
                size="small"
              />
            ) : null}
            <Text
              style={[styles.primaryText, { color: colors.primaryForeground }]}
            >
              {index === request.questions.length - 1 ? "Submit" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function OpencodePermissionPrompt({
  colors,
  busy,
  request,
  onReply,
}: {
  colors: AppColors;
  busy: boolean;
  request: OpencodePermission;
  onReply: (reply: "once" | "always" | "reject") => void;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.eyebrow,
          styles.permissionEyebrow,
          { color: colors.textSecondary },
        ]}
      >
        Permission requested
      </Text>
      <Text style={[styles.permissionTitle, { color: colors.text }]}>
        {request.permission}
      </Text>
      {request.patterns.length ? (
        <Text
          numberOfLines={3}
          style={[styles.patterns, { color: colors.textSecondary }]}
        >
          {request.patterns.join("\n")}
        </Text>
      ) : null}
      <View style={styles.permissionActions}>
        <Pressable
          disabled={busy}
          onPress={() => onReply("reject")}
          style={styles.textButton}
        >
          <Text style={[styles.dismissText, { color: colors.destructive }]}>
            Reject
          </Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => onReply("once")}
          style={[styles.outlineButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            Allow once
          </Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => onReply("always")}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : null}
          <Text
            style={[styles.primaryText, { color: colors.primaryForeground }]}
          >
            Always allow
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two,
    marginHorizontal: Spacing.two,
    maxHeight: 330,
    overflow: "hidden",
    paddingTop: 10,
  },
  questionHeader: { flexDirection: "row", paddingHorizontal: Spacing.three },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  question: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
  hint: { fontSize: 10, marginTop: 2 },
  optionScroller: { flexShrink: 1, marginTop: 7 },
  options: {
    gap: 5,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  option: {
    alignItems: "flex-start",
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionCopy: { flex: 1 },
  optionLabel: { fontSize: 11, fontWeight: "700" },
  optionDescription: { fontSize: 9, lineHeight: 13, marginTop: 1 },
  customInput: {
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 11,
    height: 36,
    paddingHorizontal: Spacing.three,
  },
  actions: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  rightActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
  textButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: Spacing.two,
  },
  buttonText: { fontSize: 10, fontWeight: "700" },
  dismissText: { fontSize: 10, fontWeight: "600" },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 34,
    paddingHorizontal: Spacing.three,
  },
  primaryText: { fontSize: 10, fontWeight: "700" },
  outlineButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  disabled: { opacity: 0.4 },
  permissionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    textTransform: "capitalize",
  },
  permissionEyebrow: { paddingHorizontal: Spacing.three },
  patterns: {
    fontFamily: "monospace",
    fontSize: 9,
    lineHeight: 14,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  permissionActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.one,
    marginTop: Spacing.two,
    padding: Spacing.one,
  },
});
