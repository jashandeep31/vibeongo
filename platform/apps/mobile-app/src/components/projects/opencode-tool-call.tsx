import * as Linking from "expo-linking";
import { Image } from "expo-image";
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
import {
  deriveOpencodeToolFileDiff,
  getOpencodeToolAttachments,
  getOpencodeToolOutput,
  groupOpencodeToolsForRendering,
  isOpencodeToolFailed,
} from "@repo/api-client";

type TodoItem = {
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
};

export function OpencodeToolCall({
  isStreaming,
  tools,
  summaryDiffs = [],
}: {
  isStreaming: boolean;
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

  if (tools.length === 1 && isOpencodeToolFailed(firstTool)) {
    return <ToolError tool={firstTool} />;
  }

  if (tools.every(isEditTool)) {
    return (
      <FileChangeGroup
        isStreaming={isStreaming}
        summaryDiffs={summaryDiffs}
        tools={tools}
      />
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

  if (tools.length === 1) {
    return <ToolItem isStreaming={isStreaming} tool={firstTool} />;
  }

  const renderGroups = groupOpencodeToolsForRendering(tools);
  const firstFileGroupIndex = renderGroups.findIndex(
    (group) => group.kind === "files",
  );
  return (
    <Collapsible
      label={`Used ${tools.length}`}
      mutedLabel={getToolNames(tools)}
    >
      <View style={styles.groupChildren}>
        {renderGroups.map((group, index) =>
          group.kind === "files" ? (
            <FileChangeGroup
              isStreaming={isStreaming}
              key={group.tools.map((tool) => tool.id).join(":")}
              summaryDiffs={index === firstFileGroupIndex ? summaryDiffs : []}
              tools={group.tools}
            />
          ) : group.kind === "skills" ? (
            <SkillGroup
              key={group.tools.map((tool) => tool.id).join(":")}
              tools={group.tools}
            />
          ) : (
            <ToolItem
              isStreaming={isStreaming}
              key={group.tools[0]!.id}
              tool={group.tools[0]!}
            />
          ),
        )}
      </View>
    </Collapsible>
  );
}

function FileChangeGroup({
  isStreaming,
  summaryDiffs,
  tools,
}: {
  isStreaming: boolean;
  summaryDiffs: SnapshotFileDiff[];
  tools: ToolPart[];
}) {
  const toolDiffs = tools.flatMap(getToolDiffs);
  const diffs = toolDiffs.length > 0 ? toolDiffs : summaryDiffs;
  const fileCount = diffs.length || tools.length;
  const title = getFileChangeTitle(tools);
  return (
    <View>
      <View style={styles.fileGroupTitle}>
        <ThemedText style={styles.summaryLabel}>{title}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </ThemedText>
      </View>
      <View style={styles.groupChildren}>
        {diffs.map((diff, index) => (
          <OpencodeFileDiff
            diff={diff}
            key={`${diff.file ?? "file"}-${index}`}
            operationLabel={null}
          />
        ))}
        {diffs.length === 0
          ? tools.map((tool) => (
              <EditStatus isStreaming={isStreaming} key={tool.id} tool={tool} />
            ))
          : null}
      </View>
    </View>
  );
}

function getFileChangeTitle(tools: ToolPart[]) {
  const names = [...new Set(tools.map(getToolName))];
  return names.length === 1 ? names[0]! : "Edit";
}

function ToolItem({
  isStreaming,
  tool,
}: {
  isStreaming: boolean;
  tool: ToolPart;
}) {
  if (isOpencodeToolFailed(tool)) return <ToolError tool={tool} />;
  if (tool.tool === "webfetch") return <WebfetchResult tool={tool} />;
  if (tool.tool === "read" || tool.tool === "glob") {
    return <ExplorationResult tool={tool} />;
  }
  if (tool.tool === "list" || tool.tool === "grep") {
    return <ResearchTool tool={tool} />;
  }
  if (tool.tool === "websearch") return <WebSearchTool tool={tool} />;
  if (tool.tool === "execute") return <ExecuteTool tool={tool} />;
  if (tool.tool === "subagent" || tool.tool === "task") {
    return <SubagentTool tool={tool} />;
  }
  if (tool.tool === "skill") return <SkillGroup tools={[tool]} />;
  if (isBrowserTool(tool)) return <BrowserTool tool={tool} />;
  return <GenericTool isStreaming={isStreaming} tool={tool} />;
}

function ResearchTool({ tool }: { tool: ToolPart }) {
  const output = getToolOutput(tool);
  const subtitle = [getResearchSubtitle(tool), ...getResearchArguments(tool)]
    .filter(Boolean)
    .join(" · ");
  return (
    <Collapsible label={getToolName(tool)} subtitle={subtitle}>
      {output ? <FormattedToolOutput output={output} /> : null}
    </Collapsible>
  );
}

function ExecuteTool({ tool }: { tool: ToolPart }) {
  const code = getStringInput(tool, "code");
  const output = getToolOutput(tool);
  return (
    <Collapsible
      label="Execute"
      subtitle={code.split("\n")[0] || (isToolPending(tool) ? "Running…" : "")}
    >
      <FormattedToolOutput
        output={`${code}${output ? `\n\n${output}` : isToolPending(tool) ? "\n\nRunning…" : ""}`}
      />
    </Collapsible>
  );
}

function WebSearchTool({ tool }: { tool: ToolPart }) {
  const provider = getMetadataString(tool, "provider");
  return (
    <Collapsible
      label={provider ? `${capitalize(provider)} Web Search` : "Web Search"}
      subtitle={getStringInput(tool, "query")}
    >
      <FormattedToolOutput output={getToolOutput(tool)} />
    </Collapsible>
  );
}

function SubagentTool({ tool }: { tool: ToolPart }) {
  const theme = useTheme();
  const agent = getStringInput(tool, "agent");
  const description = getStringInput(tool, "description");
  const background = getMetadataBoolean(tool, "background");
  return (
    <View
      style={[styles.agentCard, { backgroundColor: theme.backgroundElement }]}
    >
      {isToolPending(tool) ? (
        <ActivityIndicator size="small" />
      ) : (
        <ThemedText>◈</ThemedText>
      )}
      <ThemedText style={styles.summaryLabel}>
        {agent ? capitalize(agent) : "Subagent"}
      </ThemedText>
      <ThemedText
        numberOfLines={1}
        style={[styles.inlineValue, { color: theme.textSecondary }]}
      >
        {description}
        {background ? " (background)" : ""}
      </ThemedText>
      {getMetadataString(tool, "sessionID") ? (
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={14}
          tintColor={theme.textSecondary}
        />
      ) : null}
    </View>
  );
}

function SkillGroup({ tools }: { tools: ToolPart[] }) {
  const theme = useTheme();
  const names = tools.map(getSkillName).filter(Boolean);
  return (
    <View style={styles.inlineResult}>
      {tools.some(isToolPending) ? <ActivityIndicator size="small" /> : null}
      <ThemedText style={{ color: theme.textSecondary }}>Loaded</ThemedText>
      <ThemedText numberOfLines={1} style={styles.skillNames}>
        {names.join(", ") || "Skill"}
      </ThemedText>
      <ThemedText style={{ color: theme.textSecondary }}>
        {names.length === 1 ? "skill" : "skills"}
      </ThemedText>
    </View>
  );
}

function BrowserTool({ tool }: { tool: ToolPart }) {
  const theme = useTheme();
  const action =
    getStringInput(tool, "action") || getStringInput(tool, "command");
  const target = getStringInput(tool, "url") || getStringInput(tool, "target");
  return (
    <View style={styles.inlineResult}>
      <ThemedText style={styles.summaryLabel}>Browser</ThemedText>
      <ThemedText
        numberOfLines={1}
        style={[styles.inlineValue, { color: theme.textSecondary }]}
      >
        {[action, target].filter(Boolean).join(" · ") ||
          (isToolPending(tool) ? "Running…" : "Completed")}
      </ThemedText>
    </View>
  );
}

function ToolError({ tool }: { tool: ToolPart }) {
  const message =
    tool.state.status === "error"
      ? tool.state.error.replace(/^Error:\s*/i, "")
      : getEffectiveToolFailure(tool);
  return (
    <StatusCard
      icon="xmark.circle"
      title={`${getToolName(tool)} failed`}
      message={message}
    />
  );
}

function getEffectiveToolFailure(tool: ToolPart) {
  const metadata = getMetadata(tool);
  if (metadata.timeout === true) return "Command timed out";
  if (typeof metadata.exit === "number") {
    return `Command exited with code ${metadata.exit}`;
  }
  return getToolOutput(tool) || "Tool failed";
}

function FormattedToolOutput({ output }: { output: string }) {
  const theme = useTheme();
  if (!output) return null;
  return (
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
      <ThemedText selectable style={styles.codeText}>
        {normalizeConsoleText(output)}
      </ThemedText>
    </ScrollView>
  );
}

function Collapsible({
  children,
  label,
  mutedLabel,
  subtitle,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  label: string;
  mutedLabel?: string;
  subtitle?: string;
  defaultOpen?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View>
      <Pressable
        accessibilityLabel={`${open ? "Collapse" : "Expand"} ${label}${mutedLabel ? ` ${mutedLabel}` : ""}`}
        accessibilityRole="button"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
        {mutedLabel ? (
          <ThemedText
            style={[styles.summaryLabel, { color: theme.textSecondary }]}
          >
            {mutedLabel}
          </ThemedText>
        ) : null}
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

function EditStatus({
  isStreaming,
  tool,
}: {
  isStreaming: boolean;
  tool: ToolPart;
}) {
  const theme = useTheme();
  const file = getToolFile(tool);
  const fileName = file.split("/").filter(Boolean).at(-1) ?? "file";
  const pending =
    isStreaming &&
    (tool.state.status === "pending" || tool.state.status === "running");
  return (
    <View style={styles.inlineResult}>
      <ThemedText style={styles.summaryLabel}>{getToolName(tool)}</ThemedText>
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
  if (isOpencodeToolFailed(tool)) return <ToolError tool={tool} />;
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
  if (isOpencodeToolFailed(tool)) return <ToolError tool={tool} />;
  const path = getToolFile(tool).replace(/\/+$/, "");
  const value =
    tool.tool === "glob"
      ? `pattern=${getStringInput(tool, "pattern")}`
      : path.split("/").filter(Boolean).at(-1) || "Unknown file";
  return (
    <View>
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
      <ToolAttachments tool={tool} />
    </View>
  );
}

function GenericTool({
  isStreaming,
  tool,
}: {
  isStreaming: boolean;
  tool: ToolPart;
}) {
  const theme = useTheme();
  const state = tool.state;
  const pending =
    isStreaming && (state.status === "pending" || state.status === "running");
  const shell = isShellTool(tool);
  const command = shell ? getStringInput(tool, "command") : "";
  const result =
    state.status === "completed"
      ? state.output
      : state.status === "error"
        ? state.error
        : pending
          ? "Running…"
          : "Done";
  return (
    <Collapsible
      label={getToolName(tool)}
      subtitle={
        shell && command
          ? command
          : pending
            ? state.status
            : state.status === "error"
              ? "error"
              : "completed"
      }
    >
      <View>
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
            {shell
              ? `${command ? `$ ${command}\n\n` : ""}${result}`
              : `${JSON.stringify(state.input, null, 2)}${
                  state.status === "completed"
                    ? `\n\n${state.output}`
                    : state.status === "error"
                      ? `\n\n${state.error}`
                      : pending
                        ? "\n\nRunning…"
                        : "\n\nDone"
                }`}
          </ThemedText>
        </ScrollView>
        <ToolAttachments tool={tool} />
      </View>
    </Collapsible>
  );
}

function ToolAttachments({ tool }: { tool: ToolPart }) {
  const attachments = getOpencodeToolAttachments(tool);
  if (attachments.length === 0) return null;
  return (
    <View style={styles.attachments}>
      {attachments.map((file) =>
        file.mime.startsWith("image/") ? (
          <Image
            accessibilityLabel={file.filename ?? "Tool attachment"}
            contentFit="contain"
            key={file.id}
            source={{ uri: file.url }}
            style={styles.attachmentImage}
          />
        ) : (
          <ThemedText key={file.id} style={styles.attachmentLabel}>
            {file.filename ?? file.mime}
          </ThemedText>
        ),
      )}
    </View>
  );
}

function getToolName(tool: ToolPart) {
  if (isShellTool(tool)) return "Shell";
  const names: Record<string, string> = {
    execute: "Execute",
    list: "List",
    glob: "Glob",
    grep: "Grep",
    read: "Read",
    webfetch: "Webfetch",
    websearch: "Web Search",
    subagent: "Subagent",
    task: "Subagent",
    skill: "Skill",
    edit: "Edit",
    write: "Write",
    patch: "Patch",
    apply_patch: "Patch",
  };
  if (names[tool.tool]) return names[tool.tool]!;
  const title = "title" in tool.state ? tool.state.title : undefined;
  return typeof title === "string" && title && title !== "Completed"
    ? title
    : `${tool.tool.charAt(0).toUpperCase()}${tool.tool.slice(1)}`;
}

function getToolNames(tools: ToolPart[]) {
  return [...new Set(tools.map(getToolName))].join(", ");
}

function isShellTool(tool: ToolPart) {
  return (
    tool.tool === "bash" ||
    tool.tool === "shell" ||
    typeof tool.state.input.command === "string"
  );
}

function isBrowserTool(tool: ToolPart) {
  const name = tool.tool.toLowerCase();
  return (
    name === "browser" ||
    name.includes("playwright") ||
    name.includes("browser")
  );
}

function isToolPending(tool: ToolPart) {
  return tool.state.status === "pending" || tool.state.status === "running";
}

function getToolOutput(tool: ToolPart) {
  return normalizeConsoleText(getOpencodeToolOutput(tool));
}

function normalizeConsoleText(value: string) {
  return value
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function getResearchSubtitle(tool: ToolPart) {
  const path = getToolFile(tool).replace(/\/+$/, "");
  if (tool.tool === "read") return path.split("/").filter(Boolean).at(-1) ?? "";
  return path === "Unknown file" ? "/" : path;
}

function getResearchArguments(tool: ToolPart) {
  const args: string[] = [];
  for (const key of tool.tool === "read"
    ? ["offset", "limit"]
    : ["pattern", "include"]) {
    const value = tool.state.input[key];
    if (typeof value === "string" || typeof value === "number")
      args.push(`${key}=${value}`);
  }
  return args;
}

function getMetadata(tool: ToolPart): Record<string, unknown> {
  return "metadata" in tool.state &&
    tool.state.metadata &&
    typeof tool.state.metadata === "object"
    ? (tool.state.metadata as Record<string, unknown>)
    : {};
}

function getMetadataString(tool: ToolPart, key: string) {
  const value = getMetadata(tool)[key];
  return typeof value === "string" ? value : "";
}

function getMetadataBoolean(tool: ToolPart, key: string) {
  return getMetadata(tool)[key] === true;
}

function getSkillName(tool: ToolPart) {
  return (
    getStringInput(tool, "name") ||
    getStringInput(tool, "skill") ||
    getMetadataString(tool, "name")
  );
}

function capitalize(value: string) {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

function getToolDiffs(tool: ToolPart): SnapshotFileDiff[] {
  const metadata = "metadata" in tool.state ? tool.state.metadata : undefined;
  const files = metadata?.files;
  if (Array.isArray(files)) {
    const diffs = files.filter(isSnapshotFileDiff).map((diff) => ({
      ...diff,
      file: diff.file ?? getToolFile(tool),
    }));
    if (diffs.length > 0) return diffs;
  }

  const fileDiff = metadata?.filediff ?? metadata?.fileDiff;
  const patch = typeof metadata?.diff === "string" ? metadata.diff : undefined;
  if (isSnapshotFileDiff(fileDiff)) {
    return [
      {
        ...fileDiff,
        file: fileDiff.file ?? getToolFile(tool),
        patch: fileDiff.patch ?? patch,
      },
    ];
  }

  const inputPatch =
    getStringInput(tool, "patch") || getStringInput(tool, "patchText");
  const diffPatch = patch ?? inputPatch;
  if (!diffPatch) {
    const derived = deriveOpencodeToolFileDiff(tool);
    return derived ? [derived] : [];
  }
  const counts = countPatchChanges(diffPatch);
  return [{ file: getToolFile(tool), patch: diffPatch, ...counts }];
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
  for (const key of ["filePath", "file_path", "filepath", "path", "file"]) {
    const value = tool.state.input[key];
    if (typeof value === "string" && value) return value;
  }

  const metadata = "metadata" in tool.state ? tool.state.metadata : undefined;
  const files = metadata?.files;
  if (Array.isArray(files)) {
    const file = files.find(isSnapshotFileDiff)?.file;
    if (file) return file;
  }

  return "Unknown file";
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
  agentCard: {
    alignItems: "center",
    borderRadius: 9,
    flexDirection: "row",
    gap: 8,
    marginVertical: 3,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  attachmentImage: { borderRadius: 10, height: 180, width: "100%" },
  attachmentLabel: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  attachments: { gap: 7, paddingTop: 8 },
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
  fileGroupTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
  },
  group: { gap: 3 },
  groupChildren: { gap: 3, paddingLeft: 14 },
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
  skillNames: { flexShrink: 1, fontSize: 13, fontWeight: "700" },
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
