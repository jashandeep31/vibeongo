"use client";

import { OpencodeFileDiff } from "@/components/chat/opencode-file-diff";
import {
  deriveOpencodeToolFileDiff,
  getOpencodeToolAttachments,
  getOpencodeToolOutput,
  groupOpencodeToolsForRendering,
  isOpencodeToolFailed,
  type SnapshotFileDiff,
  type ToolPart,
} from "@repo/api-client";
import {
  Check,
  ChevronRight,
  CircleX,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";

type TodoItem = {
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: string;
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
    const questionCount = getQuestionCount(firstTool);
    return (
      <div
        role="status"
        className="border-border bg-muted/40 my-2 flex items-start gap-3 rounded-lg border p-3 text-sm"
      >
        <CircleX className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-medium">Question dismissed</p>
          <p className="text-muted-foreground leading-relaxed">
            {questionCount > 1
              ? `You dismissed ${questionCount} questions, so OpenCode stopped this turn.`
              : "You dismissed the question, so OpenCode stopped this turn."}{" "}
            Send a new message to continue.
          </p>
        </div>
      </div>
    );
  }

  if (firstTool.tool === "question" && firstTool.state.status === "completed") {
    return <CompletedQuestions tool={firstTool} />;
  }

  if (firstTool.tool === "todowrite") {
    const todos = getTodos(firstTool);
    if (todos.length > 0) return <TodoList tool={firstTool} todos={todos} />;
  }

  if (tools.length === 1 && isOpencodeToolFailed(firstTool)) {
    return <ToolError tool={firstTool} />;
  }

  const isEditGroup = tools.every((tool) => isEditTool(tool));
  if (isEditGroup) {
    return <FileChangeGroup summaryDiffs={summaryDiffs} tools={tools} />;
  }

  const isWebfetchGroup = tools.every((tool) => tool.tool === "webfetch");
  if (isWebfetchGroup) {
    return (
      <div className="space-y-1 py-1 text-sm">
        {tools.map((tool) => {
          if (isOpencodeToolFailed(tool)) {
            return <ToolError key={tool.id} tool={tool} />;
          }
          const url = getSafeWebUrl(getStringInput(tool, "url"));

          return (
            <div key={tool.id} className="flex min-w-0 items-center gap-2 py-1">
              <span className="text-foreground shrink-0 font-medium">
                Webfetch
              </span>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-blue-600 hover:underline dark:text-blue-400"
                >
                  {url}
                </a>
              ) : (
                <span className="text-muted-foreground truncate">
                  Unknown URL
                </span>
              )}
              {url ? (
                <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const isExplorationGroup = tools.every(
    (tool) => tool.tool === "read" || tool.tool === "glob",
  );
  if (isExplorationGroup) {
    const readCount = tools.filter((tool) => tool.tool === "read").length;
    const searchCount = tools.length - readCount;
    const summary = [
      readCount > 0
        ? `${readCount} ${readCount === 1 ? "read" : "reads"}`
        : null,
      searchCount > 0
        ? `${searchCount} ${searchCount === 1 ? "search" : "searches"}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <details className="group/tool text-sm">
        <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
          <span>Explored</span>
          <span className="text-muted-foreground font-normal">{summary}</span>
          <ChevronRight className="text-muted-foreground size-3 transition-transform group-open/tool:rotate-90" />
        </summary>

        <div className="space-y-2 pb-3">
          {tools.map((tool) => (
            <ExplorationResult key={tool.id} tool={tool} />
          ))}
        </div>
      </details>
    );
  }

  if (tools.length === 1) return <ToolItem tool={firstTool} />;

  const renderGroups = groupOpencodeToolsForRendering(tools);
  const firstFileGroupIndex = renderGroups.findIndex(
    (group) => group.kind === "files",
  );
  return (
    <details className="group/tool text-sm">
      <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span>Used {tools.length}</span>
        <span className="text-muted-foreground">{getToolNames(tools)}</span>
        <ChevronRight className="text-muted-foreground size-3 transition-transform group-open/tool:rotate-90" />
      </summary>
      <div className="border-border/50 ml-1 space-y-1 border-l pb-2 pl-4">
        {renderGroups.map((group, index) =>
          group.kind === "files" ? (
            <FileChangeGroup
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
            <ToolItem key={group.tools[0]!.id} tool={group.tools[0]!} />
          ),
        )}
      </div>
    </details>
  );
}

function FileChangeGroup({
  summaryDiffs,
  tools,
}: {
  summaryDiffs: SnapshotFileDiff[];
  tools: ToolPart[];
}) {
  const toolDiffs = tools.flatMap(getToolDiffs);
  const diffs = toolDiffs.length > 0 ? toolDiffs : summaryDiffs;
  const fileCount = diffs.length || tools.length;
  const title = getFileChangeTitle(tools);
  return (
    <div className="text-sm">
      <div className="text-foreground flex items-center gap-2 py-2 font-medium">
        <span>{title}</span>
        <span className="text-muted-foreground font-normal">
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </span>
      </div>
      <div className="border-border/50 ml-1 space-y-0.5 border-l pb-1 pl-4">
        {diffs.map((diff, index) => (
          <OpencodeFileDiff
            key={`${diff.file ?? "file"}-${index}`}
            diff={diff}
            operationLabel={null}
          />
        ))}
        {diffs.length === 0
          ? tools.map((tool) => <EditStatus key={tool.id} tool={tool} />)
          : null}
      </div>
    </div>
  );
}

function getFileChangeTitle(tools: ToolPart[]) {
  const names = [...new Set(tools.map(getToolName))];
  return names.length === 1 ? names[0]! : "Edit";
}

function ToolItem({ tool }: { tool: ToolPart }) {
  if (isOpencodeToolFailed(tool)) return <ToolError tool={tool} />;
  if (tool.tool === "webfetch") {
    const url = getSafeWebUrl(getStringInput(tool, "url"));
    return (
      <div className="flex min-w-0 items-center gap-2 py-1 text-sm">
        <span className="text-foreground shrink-0 font-medium">Webfetch</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 truncate text-blue-600 hover:underline dark:text-blue-400"
          >
            {url}
          </a>
        ) : (
          <span className="text-muted-foreground truncate">Unknown URL</span>
        )}
        {url ? (
          <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
        ) : null}
      </div>
    );
  }
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
  return <GenericTool tool={tool} />;
}

function ResearchTool({ tool }: { tool: ToolPart }) {
  const output = getToolOutput(tool);
  const args = getResearchArguments(tool);
  return (
    <details className="group/tool-item text-sm">
      <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span>{getToolName(tool)}</span>
        <span className="text-muted-foreground min-w-0 truncate font-normal">
          {[getResearchSubtitle(tool), ...args].filter(Boolean).join(" · ")}
        </span>
        {output ? (
          <ChevronRight className="text-muted-foreground size-3 shrink-0 transition-transform group-open/tool-item:rotate-90" />
        ) : null}
      </summary>
      {output ? <FormattedToolOutput output={output} /> : null}
    </details>
  );
}

function ExecuteTool({ tool }: { tool: ToolPart }) {
  const code = getStringInput(tool, "code");
  const output = getToolOutput(tool);
  return (
    <details className="group/tool-item text-sm">
      <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span>Execute</span>
        <span className="text-muted-foreground min-w-0 truncate font-normal">
          {code.split("\n")[0] || (isToolPending(tool) ? "Running…" : "")}
        </span>
        <ChevronRight className="text-muted-foreground size-3 shrink-0 transition-transform group-open/tool-item:rotate-90" />
      </summary>
      <pre className="border-border max-h-80 overflow-auto rounded-lg border p-4 font-mono text-xs leading-6 whitespace-pre-wrap">
        <span className="text-foreground">{code}</span>
        {output ? `\n\n${output}` : isToolPending(tool) ? "\n\nRunning…" : ""}
      </pre>
    </details>
  );
}

function WebSearchTool({ tool }: { tool: ToolPart }) {
  const provider = getMetadataString(tool, "provider");
  const title = provider ? `${capitalize(provider)} Web Search` : "Web Search";
  return (
    <details className="group/tool-item text-sm">
      <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-muted-foreground min-w-0 truncate font-normal">
          {getStringInput(tool, "query")}
        </span>
        <ChevronRight className="text-muted-foreground size-3 shrink-0 transition-transform group-open/tool-item:rotate-90" />
      </summary>
      <FormattedToolOutput output={getToolOutput(tool)} />
    </details>
  );
}

function SubagentTool({ tool }: { tool: ToolPart }) {
  const agent = getStringInput(tool, "agent");
  const description = getStringInput(tool, "description");
  const background = getMetadataBoolean(tool, "background");
  return (
    <div className="bg-muted/35 my-1 flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm">
      {isToolPending(tool) ? (
        <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
      ) : (
        <span aria-hidden>◈</span>
      )}
      <span className="shrink-0 font-medium">
        {agent ? capitalize(agent) : "Subagent"}
      </span>
      <span className="text-muted-foreground min-w-0 truncate">
        {description}
        {background ? " (background)" : ""}
      </span>
      {getMetadataString(tool, "sessionID") ? (
        <ChevronRight className="text-muted-foreground ml-auto size-3.5" />
      ) : null}
    </div>
  );
}

function SkillGroup({ tools }: { tools: ToolPart[] }) {
  const names = tools.map(getSkillName).filter(Boolean);
  const running = tools.some(isToolPending);
  return (
    <div className="flex min-w-0 items-center gap-2 py-2 text-sm">
      {running ? (
        <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
      ) : null}
      <span className="text-muted-foreground shrink-0">Loaded</span>
      <span className="min-w-0 truncate font-medium">
        {names.join(", ") || "Skill"}
      </span>
      <span className="text-muted-foreground">
        {names.length === 1 ? "skill" : "skills"}
      </span>
    </div>
  );
}

function BrowserTool({ tool }: { tool: ToolPart }) {
  const action =
    getStringInput(tool, "action") || getStringInput(tool, "command");
  const target = getStringInput(tool, "url") || getStringInput(tool, "target");
  return (
    <div className="flex min-w-0 items-center gap-2 py-2 text-sm">
      <span className="font-medium">Browser</span>
      <span className="text-muted-foreground min-w-0 truncate">
        {[action, target].filter(Boolean).join(" · ") ||
          (isToolPending(tool) ? "Running…" : "Completed")}
      </span>
    </div>
  );
}

function ToolError({ tool }: { tool: ToolPart }) {
  const message =
    tool.state.status === "error"
      ? tool.state.error.replace(/^Error:\s*/i, "")
      : getEffectiveToolFailure(tool);
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 my-1 rounded-lg border p-3 text-sm"
    >
      <div className="font-medium">{getToolName(tool)} failed</div>
      <div className="text-muted-foreground mt-1 whitespace-pre-wrap">
        {message}
      </div>
    </div>
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
  if (!output) return null;
  return (
    <pre className="border-border max-h-72 overflow-auto rounded-lg border p-4 text-xs leading-5 break-words whitespace-pre-wrap">
      {normalizeConsoleText(output)}
    </pre>
  );
}

function GenericTool({ tool }: { tool: ToolPart }) {
  const command = isShellTool(tool) ? getStringInput(tool, "command") : "";
  return (
    <details className="group/tool-item text-sm">
      <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span>{getToolName(tool)}</span>
        {command ? (
          <span className="text-muted-foreground min-w-0 truncate font-normal">
            {command}
          </span>
        ) : null}
        <ChevronRight className="text-muted-foreground size-3 shrink-0 transition-transform group-open/tool-item:rotate-90" />
      </summary>
      <ToolResult tool={tool} />
    </details>
  );
}

function TodoList({ tool, todos }: { tool: ToolPart; todos: TodoItem[] }) {
  const completedCount = todos.filter(
    (todo) => todo.status === "completed",
  ).length;

  return (
    <details
      open
      className="group/todos border-border bg-muted/20 my-2 overflow-hidden rounded-xl border text-sm"
    >
      <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-xs [&::-webkit-details-marker]:hidden">
        <span>
          {completedCount} of {todos.length} todos completed
        </span>
        <ChevronRight className="ml-auto size-3.5 transition-transform group-open/todos:rotate-90" />
      </summary>
      <div className="space-y-2 px-3 pb-3">
        {todos.map((todo, index) => (
          <div
            key={`${tool.id}-todo-${index}`}
            className="flex min-w-0 items-start gap-3"
          >
            <TodoStatus status={todo.status} />
            <span
              className={
                todo.status === "cancelled"
                  ? "text-muted-foreground min-w-0 line-through"
                  : "text-foreground min-w-0"
              }
            >
              {todo.content}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function TodoStatus({ status }: { status: TodoItem["status"] }) {
  return (
    <span className="border-border text-muted-foreground mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border">
      {status === "completed" ? (
        <Check className="size-3" />
      ) : status === "in_progress" ? (
        <span className="bg-foreground size-1.5 rounded-full" />
      ) : status === "cancelled" ? (
        <X className="size-3" />
      ) : null}
    </span>
  );
}

function EditStatus({ tool }: { tool: ToolPart }) {
  const file = getToolFile(tool);
  const fileName = file.split("/").filter(Boolean).at(-1) ?? "file";
  const isPending =
    tool.state.status === "pending" || tool.state.status === "running";

  return (
    <div className="flex min-w-0 items-center gap-2 py-2 text-sm">
      <span className="shrink-0 font-medium">{getToolName(tool)}</span>
      <span className="text-muted-foreground min-w-0 truncate">{fileName}</span>
      {isPending ? (
        <Loader2 className="text-muted-foreground ml-auto size-3.5 animate-spin" />
      ) : tool.state.status === "error" ? (
        <span className="text-destructive ml-auto text-xs">Failed</span>
      ) : (
        <span className="text-muted-foreground ml-auto text-xs">Done</span>
      )}
    </div>
  );
}

function ExplorationResult({ tool }: { tool: ToolPart }) {
  if (isOpencodeToolFailed(tool)) return <ToolError tool={tool} />;
  if (tool.tool === "glob") {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-medium">Glob</span>
        <span className="text-muted-foreground shrink-0">/</span>
        <span className="text-muted-foreground truncate">
          pattern={getStringInput(tool, "pattern")}
        </span>
      </div>
    );
  }

  const path = getToolFile(tool).replace(/\/+$/, "");
  const name = path.split("/").filter(Boolean).at(-1) ?? "Unknown file";

  return (
    <div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-medium">Read</span>
        <span className="text-muted-foreground truncate" title={path}>
          {name}
        </span>
      </div>
      <ToolAttachments tool={tool} />
    </div>
  );
}

function CompletedQuestions({ tool }: { tool: ToolPart }) {
  const questions = getQuestions(tool);
  const answers = getQuestionAnswers(tool);
  const answeredCount = answers.filter((answer) => answer.length > 0).length;

  return (
    <details open className="group/tool py-1 text-sm">
      <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span>Questions</span>
        <span className="text-muted-foreground font-normal">
          {answeredCount} answered
        </span>
        <ChevronRight className="text-muted-foreground size-3 transition-transform group-open/tool:rotate-90" />
      </summary>
      <div className="space-y-4 pt-2 pb-3">
        {questions.map((question, index) => (
          <div key={`${tool.id}-answer-${index}`} className="space-y-1">
            <p className="text-muted-foreground">{question}</p>
            <p className="text-foreground">
              {answers[index]?.join(", ") || "No answer"}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

function ToolResult({ tool }: { tool: ToolPart }) {
  const state = tool.state;

  if (isShellTool(tool)) {
    const command = getStringInput(tool, "command");
    const result =
      state.status === "completed"
        ? state.output
        : state.status === "error"
          ? state.error
          : "Running…";

    return (
      <>
        <pre className="border-border max-h-72 overflow-auto rounded-lg border p-4 font-mono text-xs leading-6 whitespace-pre-wrap">
          {command ? `$ ${command}\n\n` : ""}
          {result}
        </pre>
        <ToolAttachments tool={tool} />
      </>
    );
  }

  return (
    <div className="border-border space-y-3 rounded-lg border p-4">
      <pre className="overflow-auto text-xs break-words whitespace-pre-wrap">
        {JSON.stringify(state.input, null, 2)}
      </pre>
      {state.status === "completed" ? (
        <pre className="max-h-72 overflow-auto text-xs break-words whitespace-pre-wrap">
          {state.output}
        </pre>
      ) : null}
      {state.status === "error" ? (
        <pre className="text-destructive max-h-72 overflow-auto text-xs break-words whitespace-pre-wrap">
          {state.error}
        </pre>
      ) : null}
      {state.status === "pending" || state.status === "running" ? (
        <div className="text-muted-foreground text-xs">Running…</div>
      ) : null}
      <ToolAttachments tool={tool} />
    </div>
  );
}

function ToolAttachments({ tool }: { tool: ToolPart }) {
  const attachments = getOpencodeToolAttachments(tool);
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {attachments.map((file) =>
        file.mime.startsWith("image/") && isSafeImageUrl(file.url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={file.id}
            src={file.url}
            alt={file.filename ?? "Tool attachment"}
            className="max-h-64 max-w-full rounded-lg object-contain"
          />
        ) : (
          <span
            key={file.id}
            className="border-border bg-muted/30 rounded-md border px-2 py-1 text-xs"
          >
            {file.filename ?? file.mime}
          </span>
        ),
      )}
    </div>
  );
}

function isSafeImageUrl(url: string) {
  return /^(?:https?:|blob:|data:image\/)/i.test(url);
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
  return title && title !== "Completed"
    ? title
    : `${tool.tool.charAt(0).toUpperCase()}${tool.tool.slice(1)}`;
}

function getToolNames(tools: ToolPart[]) {
  return [...new Set(tools.map(getToolName))].join(", ");
}

function isEditTool(tool: ToolPart) {
  return ["edit", "write", "patch", "apply_patch"].includes(tool.tool);
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
  const metadata =
    "metadata" in tool.state && tool.state.metadata
      ? tool.state.metadata
      : undefined;
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

  if (!patch) {
    const derived = deriveOpencodeToolFileDiff(tool);
    return derived ? [derived] : [];
  }

  const stats = countPatchChanges(patch);
  return [
    {
      file: getToolFile(tool),
      patch,
      additions: stats.additions,
      deletions: stats.deletions,
      status: "modified",
    },
  ];
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

  const metadata =
    "metadata" in tool.state && tool.state.metadata
      ? tool.state.metadata
      : undefined;
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
    if (line.startsWith("@@")) {
      insideHunk = true;
    } else if (insideHunk && line.startsWith("+")) {
      additions += 1;
    } else if (insideHunk && line.startsWith("-")) {
      deletions += 1;
    }
  }

  return { additions, deletions };
}

function getStringInput(tool: ToolPart, key: string) {
  const value = tool.state.input[key];
  return typeof value === "string" ? value : "";
}

function getQuestionCount(tool: ToolPart) {
  const questions = getQuestions(tool);
  return questions.length || 1;
}

function getQuestions(tool: ToolPart) {
  const questions = tool.state.input.questions;
  if (!Array.isArray(questions)) return [];

  return questions.flatMap((question) => {
    if (
      typeof question === "object" &&
      question !== null &&
      "question" in question &&
      typeof question.question === "string"
    ) {
      return [question.question];
    }
    return [];
  });
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
  const metadata =
    "metadata" in tool.state && tool.state.metadata
      ? tool.state.metadata
      : undefined;
  const value = Array.isArray(metadata?.todos)
    ? metadata.todos
    : tool.state.input.todos;
  if (!Array.isArray(value)) return [];

  return value.flatMap((todo) => {
    if (!todo || typeof todo !== "object") return [];

    const candidate = todo as Record<string, unknown>;
    if (typeof candidate.content !== "string" || !candidate.content.trim()) {
      return [];
    }

    const status = candidate.status;
    if (
      status !== "pending" &&
      status !== "in_progress" &&
      status !== "completed" &&
      status !== "cancelled"
    ) {
      return [];
    }

    return [
      {
        content: candidate.content,
        status,
        priority:
          typeof candidate.priority === "string"
            ? candidate.priority
            : undefined,
      },
    ];
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
