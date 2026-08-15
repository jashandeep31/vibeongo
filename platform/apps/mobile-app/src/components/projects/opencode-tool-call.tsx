import * as Linking from "expo-linking";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  isEditTool,
  type SnapshotFileDiff,
  type ToolPart,
} from "@/components/projects/opencode-chat-turns";
import { OpencodeFileDiff } from "@/components/projects/opencode-file-diff";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type TodoItem = {
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
};

export function OpencodeToolCall({
  tools,
  summaryDiffs = [],
}: {
  tools: ToolPart[];
  summaryDiffs?: SnapshotFileDiff[];
}) {
  const firstTool = tools[0];
  if (!firstTool) return null;

  if (
    firstTool.tool === "question" &&
    firstTool.state.status === "error" &&
    firstTool.state.error.toLowerCase().includes("dismiss")
  ) {
    const questionCount = getQuestions(firstTool).length || 1;
    return (
      <StatusCard
        icon="xmark.circle"
        title="Question dismissed"
        message={
          questionCount > 1
            ? `You dismissed ${questionCount} questions, so OpenCode stopped this turn.`
            : "You dismissed the question, so OpenCode stopped this turn."
        }
      />
    );
  }

  if (firstTool.tool === "question" && firstTool.state.status === "completed") {
    return <CompletedQuestions tool={firstTool} />;
  }

  if (firstTool.tool === "todowrite") {
    const todos = getTodos(firstTool);
    if (todos.length > 0) return <TodoList todos={todos} />;
  }

  if (tools.every(isEditTool)) {
    const toolDiffs = tools.flatMap((tool) => {
      const diff = getToolDiff(tool);
      return diff ? [diff] : [];
    });
    const diffs = toolDiffs.length > 0 ? toolDiffs : summaryDiffs;
    return (
      <View style={styles.group}>
        {diffs.map((diff, index) => (
          <OpencodeFileDiff
            defaultOpen={index === 0}
            diff={diff}
            key={`${diff.file ?? "file"}-${index}`}
          />
        ))}
        {diffs.length === 0
          ? tools.map((tool) => <EditStatus key={tool.id} tool={tool} />)
          : null}
      </View>
    );
  }

  if (tools.every((tool) => tool.tool === "webfetch")) {
    return (
      <View style={styles.group}>
        {tools.map((tool) => (
          <WebfetchResult key={tool.id} tool={tool} />
        ))}
      </View>
    );
  }

  if (tools.every((tool) => tool.tool === "read" || tool.tool === "glob")) {
    return <ExplorationGroup tools={tools} />;
  }

  return <GenericTool tool={firstTool} />;
}

function Collapsible({
  children,
  label,
  subtitle,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  label: string;
  subtitle?: string;
  defaultOpen?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View>
      <Pressable
        accessibilityLabel={`${open ? "Collapse" : "Expand"} ${label}`}
        accessibilityRole="button"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
        {subtitle ? (
          <ThemedText
            numberOfLines={1}
            style={[styles.summarySubtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </ThemedText>
        ) : null}
        <SymbolView
          name={{
            ios: open ? "chevron.down" : "chevron.right",
            android: open ? "expand_more" : "chevron_right",
          }}
          size={14}
          tintColor={theme.textSecondary}
        />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

function StatusCard({
  icon,
  title,
  message,
}: {
  icon: string;
  title: string;
  message: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.statusCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <SymbolView
        name={{ ios: icon as never, android: "cancel" }}
        size={17}
        tintColor={theme.textSecondary}
      />
      <View style={styles.statusBody}>
        <ThemedText style={styles.summaryLabel}>{title}</ThemedText>
        <ThemedText style={{ color: theme.textSecondary }}>
          {message}
        </ThemedText>
      </View>
    </View>
  );
}

function TodoList({ todos }: { todos: TodoItem[] }) {
  const theme = useTheme();
  const completedCount = todos.filter(
    (todo) => todo.status === "completed",
  ).length;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <ThemedText style={[styles.cardCaption, { color: theme.textSecondary }]}>
        {completedCount} of {todos.length} todos completed
      </ThemedText>
      <View style={styles.todoList}>
        {todos.map((todo, index) => (
          <View key={`${todo.content}-${index}`} style={styles.todoRow}>
            <View
              style={[styles.todoStatus, { borderColor: theme.textSecondary }]}
            >
              {todo.status === "completed" ? (
                <SymbolView
                  name={{ ios: "checkmark", android: "check" }}
                  size={10}
                  tintColor={theme.text}
                />
              ) : todo.status === "in_progress" ? (
                <View
                  style={[styles.todoDot, { backgroundColor: theme.text }]}
                />
              ) : todo.status === "cancelled" ? (
                <SymbolView
                  name={{ ios: "xmark", android: "close" }}
                  size={9}
                  tintColor={theme.textSecondary}
                />
              ) : null}
            </View>
            <ThemedText
              style={[
                styles.todoText,
                todo.status === "cancelled" && {
                  color: theme.textSecondary,
                  textDecorationLine: "line-through",
                },
              ]}
            >
              {todo.content}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function CompletedQuestions({ tool }: { tool: ToolPart }) {
  const questions = getQuestions(tool);
  const answers = getQuestionAnswers(tool);
  const answeredCount = answers.filter((answer) => answer.length > 0).length;
  return (
    <Collapsible
      defaultOpen
      label="Questions"
      subtitle={`${answeredCount} answered`}
    >
      <View style={styles.questions}>
        {questions.map((question, index) => (
          <View key={`${tool.id}-${index}`} style={styles.questionAnswer}>
            <ThemedText themeColor="textSecondary">{question}</ThemedText>
            <ThemedText>{answers[index]?.join(", ") || "No answer"}</ThemedText>
          </View>
        ))}
      </View>
    </Collapsible>
  );
}

function EditStatus({ tool }: { tool: ToolPart }) {
  const theme = useTheme();
  const file = getToolFile(tool);
  const fileName = file.split("/").filter(Boolean).at(-1) ?? "file";
  const pending =
    tool.state.status === "pending" || tool.state.status === "running";
  return (
    <View style={styles.inlineResult}>
      <ThemedText style={styles.summaryLabel}>Edit</ThemedText>
      <ThemedText
        numberOfLines={1}
        style={[styles.inlineValue, { color: theme.textSecondary }]}
      >
        {fileName}
      </ThemedText>
      {pending ? (
        <ActivityIndicator size="small" />
      ) : (
        <ThemedText
          style={{
            color:
              tool.state.status === "error" ? "#ef4444" : theme.textSecondary,
            fontSize: 12,
          }}
        >
          {tool.state.status === "error" ? "Failed" : "Done"}
        </ThemedText>
      )}
    </View>
  );
}

function WebfetchResult({ tool }: { tool: ToolPart }) {
  const theme = useTheme();
  const url = getSafeWebUrl(getStringInput(tool, "url"));
  return (
    <Pressable
      accessibilityRole={url ? "link" : undefined}
      disabled={!url}
      onPress={() => url && void Linking.openURL(url)}
      style={({ pressed }) => [styles.inlineResult, pressed && styles.pressed]}
    >
      <ThemedText style={styles.summaryLabel}>Webfetch</ThemedText>
      <ThemedText
        numberOfLines={1}
        style={[
          styles.inlineValue,
          { color: url ? "#3b82f6" : theme.textSecondary },
        ]}
      >
        {url ?? "Unknown URL"}
      </ThemedText>
      {url ? (
        <SymbolView
          name={{ ios: "arrow.up.right.square", android: "open_in_new" }}
          size={15}
          tintColor={theme.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

function ExplorationGroup({ tools }: { tools: ToolPart[] }) {
  const readCount = tools.filter((tool) => tool.tool === "read").length;
  const searchCount = tools.length - readCount;
  const summary = [
    readCount ? `${readCount} ${readCount === 1 ? "read" : "reads"}` : null,
    searchCount
      ? `${searchCount} ${searchCount === 1 ? "search" : "searches"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Collapsible label="Explored" subtitle={summary}>
      <View style={styles.explorationList}>
        {tools.map((tool) => (
          <ExplorationResult key={tool.id} tool={tool} />
        ))}
      </View>
    </Collapsible>
  );
}

function ExplorationResult({ tool }: { tool: ToolPart }) {
  const theme = useTheme();
  const path = getStringInput(tool, "filePath").replace(/\/+$/, "");
  const value =
    tool.tool === "glob"
      ? `pattern=${getStringInput(tool, "pattern")}`
      : path.split("/").filter(Boolean).at(-1) || "Unknown file";
  return (
    <View style={styles.inlineResult}>
      <ThemedText style={styles.summaryLabel}>
        {tool.tool === "glob" ? "Glob" : "Read"}
      </ThemedText>
      <ThemedText
        numberOfLines={1}
        style={[styles.inlineValue, { color: theme.textSecondary }]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function GenericTool({ tool }: { tool: ToolPart }) {
  const theme = useTheme();
  const state = tool.state;
  const command = tool.tool === "bash" ? getStringInput(tool, "command") : "";
  const result =
    state.status === "completed"
      ? state.output
      : state.status === "error"
        ? state.error
        : "Running…";
  return (
    <Collapsible
      label={getToolName(tool)}
      subtitle={state.status === "pending" ? "pending" : state.status}
    >
      <ScrollView
        horizontal
        style={[
          styles.codeBlock,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <ThemedText
          selectable
          style={[
            styles.codeText,
            state.status === "error" && styles.errorText,
          ]}
        >
          {tool.tool === "bash"
            ? `${command ? `$ ${command}\n\n` : ""}${result}`
            : `${JSON.stringify(state.input, null, 2)}${
                state.status === "completed"
                  ? `\n\n${state.output}`
                  : state.status === "error"
                    ? `\n\n${state.error}`
                    : "\n\nRunning…"
              }`}
        </ThemedText>
      </ScrollView>
    </Collapsible>
  );
}

function getToolName(tool: ToolPart) {
  if (tool.tool === "bash") return "Shell";
  const title = "title" in tool.state ? tool.state.title : undefined;
  return typeof title === "string" && title
    ? title
    : `${tool.tool.charAt(0).toUpperCase()}${tool.tool.slice(1)}`;
}

function getToolDiff(tool: ToolPart): SnapshotFileDiff | undefined {
  const metadata = "metadata" in tool.state ? tool.state.metadata : undefined;
  const fileDiff = metadata?.filediff ?? metadata?.fileDiff;
  const patch = typeof metadata?.diff === "string" ? metadata.diff : undefined;
  if (isSnapshotFileDiff(fileDiff)) {
    return { ...fileDiff, patch: fileDiff.patch ?? patch };
  }

  const inputPatch = getStringInput(tool, "patch");
  const diffPatch = patch ?? inputPatch;
  if (!diffPatch) return undefined;
  const counts = countPatchChanges(diffPatch);
  return { file: getToolFile(tool), patch: diffPatch, ...counts };
}

function isSnapshotFileDiff(value: unknown): value is SnapshotFileDiff {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.additions === "number" &&
    typeof candidate.deletions === "number" &&
    (candidate.patch === undefined || typeof candidate.patch === "string") &&
    (candidate.file === undefined || typeof candidate.file === "string")
  );
}

function getToolFile(tool: ToolPart) {
  for (const key of ["filePath", "path", "file"]) {
    const value = tool.state.input[key];
    if (typeof value === "string" && value) return value;
  }
  return "title" in tool.state && typeof tool.state.title === "string"
    ? tool.state.title
    : "Unknown file";
}

function countPatchChanges(patch: string) {
  let additions = 0;
  let deletions = 0;
  let insideHunk = false;
  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) insideHunk = true;
    else if (insideHunk && line.startsWith("+")) additions += 1;
    else if (insideHunk && line.startsWith("-")) deletions += 1;
  }
  return { additions, deletions };
}

function getStringInput(tool: ToolPart, key: string) {
  const value = tool.state.input[key];
  return typeof value === "string" ? value : "";
}

function getQuestions(tool: ToolPart) {
  const questions = tool.state.input.questions;
  if (!Array.isArray(questions)) return [];
  return questions.flatMap((question) =>
    question &&
    typeof question === "object" &&
    "question" in question &&
    typeof question.question === "string"
      ? [question.question]
      : [],
  );
}

function getQuestionAnswers(tool: ToolPart) {
  if (tool.state.status !== "completed") return [];
  const answers = tool.state.metadata.answers;
  if (!Array.isArray(answers)) return [];
  return answers.map((answer) =>
    Array.isArray(answer)
      ? answer.filter((value): value is string => typeof value === "string")
      : [],
  );
}

function getTodos(tool: ToolPart): TodoItem[] {
  const metadata = "metadata" in tool.state ? tool.state.metadata : undefined;
  const value = Array.isArray(metadata?.todos)
    ? metadata.todos
    : tool.state.input.todos;
  if (!Array.isArray(value)) return [];
  return value.flatMap((todo) => {
    if (!todo || typeof todo !== "object") return [];
    const candidate = todo as Record<string, unknown>;
    const status = candidate.status;
    if (
      typeof candidate.content !== "string" ||
      !candidate.content.trim() ||
      (status !== "pending" &&
        status !== "in_progress" &&
        status !== "completed" &&
        status !== "cancelled")
    ) {
      return [];
    }
    return [{ content: candidate.content, status }];
  });
}

function getSafeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    marginVertical: 5,
    padding: 12,
  },
  cardCaption: { fontSize: 12 },
  codeBlock: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 280,
    padding: 12,
  },
  codeText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 18,
    minWidth: 320,
  },
  errorText: { color: "#ef4444" },
  explorationList: { gap: 5, paddingBottom: 8 },
  group: { gap: 3 },
  inlineResult: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 34,
  },
  inlineValue: { flex: 1, fontSize: 12 },
  pressed: { opacity: 0.7 },
  questionAnswer: { gap: 3 },
  questions: { gap: 14, paddingBottom: 10 },
  statusBody: { flex: 1, gap: 2 },
  statusCard: {
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    marginVertical: 5,
    padding: 12,
  },
  summary: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
  },
  summaryLabel: { fontSize: 13, fontWeight: "700" },
  summarySubtitle: { flex: 1, fontSize: 12 },
  todoDot: { borderRadius: 3, height: 6, width: 6 },
  todoList: { gap: 9 },
  todoRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  todoStatus: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    height: 16,
    justifyContent: "center",
    marginTop: 2,
    width: 16,
  },
  todoText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
