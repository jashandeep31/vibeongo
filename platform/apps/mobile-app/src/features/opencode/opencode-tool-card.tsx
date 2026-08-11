import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Radius, Spacing, type AppColors } from "@/constants/theme";

import type { OpencodePart } from "./opencode-api";

export function OpencodeToolCard({
  colors,
  part,
}: {
  colors: AppColors;
  part: OpencodePart;
}) {
  const [expanded, setExpanded] = useState(false);
  const state = part.state;
  if (!part.tool || !state) return null;

  const running = state.status === "pending" || state.status === "running";
  const failed = state.status === "error";
  const input = state.input ?? {};
  const title = toolTitle(part.tool, state.title);
  const summary = toolSummary(part.tool, input);
  const todos =
    part.tool === "todowrite"
      ? getTodos(
          Array.isArray(state.metadata?.todos)
            ? { todos: state.metadata.todos }
            : input,
        )
      : [];
  const questions = part.tool === "question" ? getQuestions(input) : [];
  const answers = part.tool === "question" ? getAnswers(state) : [];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: failed ? colors.destructive : colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((current) => !current)}
        style={styles.header}
      >
        <AppIcon
          name={
            failed
              ? { ios: "xmark.circle", android: "error", web: "error" }
              : running
                ? {
                    ios: "clock",
                    android: "progress_activity",
                    web: "progress_activity",
                  }
                : {
                    ios: "checkmark.circle",
                    android: "check_circle",
                    web: "check_circle",
                  }
          }
          size={17}
          tintColor={failed ? colors.destructive : colors.textSecondary}
        />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {summary ? (
            <Text
              numberOfLines={1}
              style={[styles.summary, { color: colors.textSecondary }]}
            >
              {summary}
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.status,
            { color: failed ? colors.destructive : colors.textSecondary },
          ]}
        >
          {running ? "Running" : failed ? "Failed" : "Done"}
        </Text>
        <AppIcon
          name={
            expanded
              ? {
                  ios: "chevron.up",
                  android: "expand_less",
                  web: "expand_less",
                }
              : {
                  ios: "chevron.down",
                  android: "expand_more",
                  web: "expand_more",
                }
          }
          size={16}
          tintColor={colors.textSecondary}
        />
      </Pressable>

      {todos.length ? (
        <View style={[styles.details, { borderTopColor: colors.border }]}>
          {todos.map((todo, index) => (
            <View key={`${part.id}-todo-${index}`} style={styles.todoRow}>
              <AppIcon
                name={
                  todo.status === "completed"
                    ? {
                        ios: "checkmark.square",
                        android: "check_box",
                        web: "check_box",
                      }
                    : {
                        ios: "square",
                        android: "check_box_outline_blank",
                        web: "check_box_outline_blank",
                      }
                }
                size={16}
                tintColor={colors.textSecondary}
              />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {todo.content}
              </Text>
            </View>
          ))}
        </View>
      ) : questions.length && state.status === "completed" ? (
        <View style={[styles.details, { borderTopColor: colors.border }]}>
          {questions.map((question, index) => (
            <View
              key={`${part.id}-question-${index}`}
              style={styles.questionResult}
            >
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                {question}
              </Text>
              <Text style={[styles.detailText, { color: colors.text }]}>
                {answers[index]?.join(", ") || "No answer"}
              </Text>
            </View>
          ))}
        </View>
      ) : expanded ? (
        <View style={[styles.details, { borderTopColor: colors.border }]}>
          <CodeBlock colors={colors} value={formatInput(part.tool, input)} />
          {state.output ? (
            <CodeBlock colors={colors} value={state.output} />
          ) : null}
          {state.error ? (
            <CodeBlock colors={colors} error value={state.error} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CodeBlock({
  colors,
  error,
  value,
}: {
  colors: AppColors;
  error?: boolean;
  value: string;
}) {
  return (
    <Text
      selectable
      style={[
        styles.code,
        { color: error ? colors.destructive : colors.textSecondary },
      ]}
    >
      {value}
    </Text>
  );
}

function toolTitle(tool: string, title?: string) {
  if (tool === "bash") return "Shell";
  if (["edit", "write", "patch", "apply_patch"].includes(tool)) return "Edit";
  if (tool === "todowrite") return "Tasks";
  if (tool === "question") return "Questions";
  return title || `${tool.charAt(0).toUpperCase()}${tool.slice(1)}`;
}

function toolSummary(tool: string, input: Record<string, unknown>) {
  if (tool === "bash") return stringValue(input.command);
  if (tool === "glob") return stringValue(input.pattern);
  if (tool === "webfetch") return stringValue(input.url);
  if (["read", "edit", "write", "patch", "apply_patch"].includes(tool)) {
    const path = stringValue(input.filePath) || stringValue(input.path);
    return path.split("/").filter(Boolean).at(-1) ?? path;
  }
  return "";
}

function formatInput(tool: string, input: Record<string, unknown>) {
  const json = JSON.stringify(input, null, 2);
  return tool === "bash" && typeof input.command === "string"
    ? `$ ${input.command}`
    : json;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getTodos(input: Record<string, unknown>) {
  if (!Array.isArray(input.todos)) return [];
  return input.todos.flatMap((todo) =>
    todo &&
    typeof todo === "object" &&
    "content" in todo &&
    typeof todo.content === "string"
      ? [
          {
            content: todo.content,
            status:
              "status" in todo && typeof todo.status === "string"
                ? todo.status
                : "pending",
          },
        ]
      : [],
  );
}

function getQuestions(input: Record<string, unknown>) {
  if (!Array.isArray(input.questions)) return [];
  return input.questions.flatMap((question) =>
    question &&
    typeof question === "object" &&
    "question" in question &&
    typeof question.question === "string"
      ? [question.question]
      : [],
  );
}

function getAnswers(state: NonNullable<OpencodePart["state"]>) {
  const metadataAnswers = state.metadata?.answers;
  if (Array.isArray(metadataAnswers)) return metadataAnswers as string[][];
  if (!state.output) return [];
  try {
    const parsed = JSON.parse(state.output) as unknown;
    if (Array.isArray(parsed)) return parsed as string[][];
  } catch {}
  return [];
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "700" },
  summary: { fontSize: 11, marginTop: 2 },
  status: { fontSize: 10, fontWeight: "600" },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  code: { fontFamily: "monospace", fontSize: 11, lineHeight: 17 },
  todoRow: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.two },
  detailText: { flex: 1, fontSize: 12, lineHeight: 18 },
  detailLabel: { fontSize: 11, lineHeight: 16 },
  questionResult: { gap: 3 },
});
