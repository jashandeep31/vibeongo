"use client";

import { OpencodeFileDiff } from "@/components/chat/opencode-file-diff";
import type { SnapshotFileDiff, ToolPart } from "@opencode-ai/sdk/v2/client";
import { ChevronRight, CircleX, ExternalLink, Loader2 } from "lucide-react";

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

  const isEditGroup = tools.every((tool) => isEditTool(tool));
  if (isEditGroup) {
    const toolDiffs = tools.flatMap((tool) => {
      const diff = getToolDiff(tool);
      return diff ? [diff] : [];
    });
    const diffs = toolDiffs.length > 0 ? toolDiffs : summaryDiffs;

    return (
      <div className="space-y-0.5 py-1">
        {diffs.map((diff, index) => (
          <OpencodeFileDiff
            key={`${diff.file ?? "file"}-${index}`}
            diff={diff}
            defaultOpen={index === 0}
          />
        ))}
        {diffs.length === 0
          ? tools.map((tool) => <EditStatus key={tool.id} tool={tool} />)
          : null}
      </div>
    );
  }

  const isWebfetchGroup = tools.every((tool) => tool.tool === "webfetch");
  if (isWebfetchGroup) {
    return (
      <div className="space-y-1 py-1 text-sm">
        {tools.map((tool) => {
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

  return (
    <details className="group/tool text-sm">
      <summary className="text-foreground flex cursor-pointer list-none items-center gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span>{getToolName(firstTool)}</span>
        <ChevronRight className="text-muted-foreground size-3 transition-transform group-open/tool:rotate-90" />
      </summary>

      <ToolResult tool={firstTool} />
    </details>
  );
}

function EditStatus({ tool }: { tool: ToolPart }) {
  const file = getToolFile(tool);
  const fileName = file.split("/").filter(Boolean).at(-1) ?? "file";
  const isPending =
    tool.state.status === "pending" || tool.state.status === "running";

  return (
    <div className="flex min-w-0 items-center gap-2 py-2 text-sm">
      <span className="shrink-0 font-medium">Edit</span>
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

  const path = getStringInput(tool, "filePath").replace(/\/+$/, "");
  const name = path.split("/").filter(Boolean).at(-1) ?? "Unknown file";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 font-medium">Read</span>
      <span className="text-muted-foreground truncate" title={path}>
        {name}
      </span>
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

  if (tool.tool === "bash") {
    const command = getStringInput(tool, "command");
    const result =
      state.status === "completed"
        ? state.output
        : state.status === "error"
          ? state.error
          : "Running…";

    return (
      <pre className="border-border max-h-72 overflow-auto rounded-lg border p-4 font-mono text-xs leading-6 whitespace-pre-wrap">
        {command ? `$ ${command}\n\n` : ""}
        {result}
      </pre>
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
    </div>
  );
}

function getToolName(tool: ToolPart) {
  if (tool.tool === "bash") return "Shell";

  const title = "title" in tool.state ? tool.state.title : undefined;
  return title || `${tool.tool.charAt(0).toUpperCase()}${tool.tool.slice(1)}`;
}

function isEditTool(tool: ToolPart) {
  return ["edit", "write", "patch", "apply_patch"].includes(tool.tool);
}

function getToolDiff(tool: ToolPart): SnapshotFileDiff | undefined {
  const metadata =
    "metadata" in tool.state && tool.state.metadata
      ? tool.state.metadata
      : undefined;
  const fileDiff = metadata?.filediff ?? metadata?.fileDiff;

  const patch = typeof metadata?.diff === "string" ? metadata.diff : undefined;
  if (isSnapshotFileDiff(fileDiff)) {
    return { ...fileDiff, patch: fileDiff.patch ?? patch };
  }

  if (!patch) return undefined;

  const stats = countPatchChanges(patch);
  return {
    file: getToolFile(tool),
    patch,
    additions: stats.additions,
    deletions: stats.deletions,
    status: "modified",
  };
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

  const title = "title" in tool.state ? tool.state.title : undefined;
  return typeof title === "string" && title ? title : "Unknown file";
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
