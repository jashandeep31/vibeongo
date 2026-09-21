// Stable UI-facing types. OpenCode v2 exposes raw protocol types, while the
// applications in this workspace consume this normalized representation.
export type SnapshotFileDiff = {
  file?: string;
  patch?: string;
  additions: number;
  deletions: number;
  status?: "added" | "deleted" | "modified";
};

export type Session = {
  id: string;
  slug: string;
  projectID: string;
  workspaceID?: string;
  directory: string;
  path?: string;
  parentID?: string;
  summary?: {
    additions: number;
    deletions: number;
    files: number;
    diffs?: SnapshotFileDiff[];
  };
  cost?: number;
  tokens?: TokenUsage;
  share?: { url: string };
  title: string;
  agent?: string;
  model?: { id: string; providerID: string; variant?: string };
  version: string;
  metadata?: Record<string, unknown>;
  time: {
    created: number;
    updated: number;
    compacting?: number;
    archived?: number;
  };
  revert?: {
    messageID: string;
    partID?: string;
    snapshot?: string;
    files?: SnapshotFileDiff[];
  };
};

export type TokenUsage = {
  total?: number;
  input: number;
  output: number;
  reasoning: number;
  cache: { read: number; write: number };
};

export type OpencodeError = {
  code: string;
  title: string;
  message: string;
  statusCode?: number;
  providerID?: string;
  retryable?: boolean;
};

export type UserMessage = {
  id: string;
  sessionID: string;
  role: "user";
  time: { created: number };
  agent: string;
  model: { providerID: string; modelID: string; variant?: string };
  summary?: { title?: string; body?: string; diffs: SnapshotFileDiff[] };
};

export type AssistantMessage = {
  id: string;
  sessionID: string;
  role: "assistant";
  time: { created: number; streamed?: number; completed?: number };
  parentID: string;
  modelID: string;
  providerID: string;
  mode: string;
  agent: string;
  path: { cwd: string; root: string };
  cost: number;
  tokens: TokenUsage;
  variant?: string;
  finish?: string | undefined;
  rawFinish?: string | undefined;
  providerState?: Record<string, unknown> | undefined;
  error?: OpencodeError | undefined;
  retry?: { attempt: number; at: number; error: OpencodeError } | undefined;
  snapshot?: { start?: string; end?: string; files?: string[] } | undefined;
  summary?: { title?: string; body?: string; diffs: SnapshotFileDiff[] };
};

export type Message = UserMessage | AssistantMessage;

type PartBase = { id: string; sessionID: string; messageID: string };

export type TextPart = PartBase & {
  type: "text";
  text: string;
  synthetic?: boolean;
  /** Render as a compact transcript notice rather than assistant prose. */
  display?: "notice";
  noticeKind?:
    | "system"
    | "synthetic"
    | "skill"
    | "location"
    | "compaction";
  ignored?: boolean;
  time?: { start: number; end?: number };
  metadata?: Record<string, unknown>;
};

export type ReasoningPart = PartBase & {
  type: "reasoning";
  text: string;
  metadata?: Record<string, unknown>;
  time: { start: number; end?: number };
};

export type FilePart = PartBase & {
  type: "file";
  mime: string;
  filename?: string;
  url: string;
  source?:
    | { type: "file"; path: string; text: SourceText }
    | { type: "resource"; clientName: string; uri: string; text: SourceText }
    | {
        type: "symbol";
        path: string;
        name: string;
        kind: number;
        text: SourceText;
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
      };
};

type SourceText = { value: string; start: number; end: number };

export type ToolState =
  | { status: "pending"; input: Record<string, unknown>; raw: string }
  | {
      status: "running";
      input: Record<string, unknown>;
      title?: string;
      metadata?: Record<string, unknown> | undefined;
      time: { start: number; ran?: number };
    }
  | {
      status: "completed";
      input: Record<string, unknown>;
      output: string;
      title: string;
      metadata: Record<string, unknown>;
      time: { start: number; end: number; compacted?: number };
      attachments?: FilePart[];
      content?: Array<Record<string, unknown>>;
    }
  | {
      status: "error";
      input: Record<string, unknown>;
      error: string;
      structuredError?: OpencodeError | undefined;
      metadata?: Record<string, unknown> | undefined;
      time: { start: number; end: number };
      content?: Array<Record<string, unknown>>;
    };

export type ToolPart = PartBase & {
  type: "tool";
  callID: string;
  tool: string;
  state: ToolState;
  metadata?: Record<string, unknown>;
  executed?: boolean;
  providerState?: Record<string, unknown> | undefined;
  providerResultState?: Record<string, unknown> | undefined;
};

export type Part =
  | TextPart
  | ReasoningPart
  | FilePart
  | ToolPart
  | (PartBase & { type: "step-start"; snapshot?: string })
  | (PartBase & {
      type: "step-finish";
      reason: string;
      snapshot?: string;
      cost: number;
      tokens: TokenUsage;
    })
  | (PartBase & { type: "snapshot"; snapshot: string })
  | (PartBase & { type: "patch"; hash: string; files: string[] })
  | (PartBase & { type: "compaction"; auto: boolean; overflow?: boolean });

export type SessionStatus =
  | { type: "idle" }
  | { type: "busy" }
  | {
      type: "retry";
      attempt: number;
      message: string;
      next: number;
      action?: {
        reason: string;
        provider: string;
        title: string;
        message: string;
        label: string;
        link?: string;
      };
    };

export type QuestionOption = { label: string; description: string };
export type QuestionRequest = {
  id: string;
  sessionID: string;
  questions: Array<{
    question: string;
    header: string;
    options: QuestionOption[];
    multiple?: boolean;
    custom?: boolean;
  }>;
  tool?: { messageID: string; callID: string };
};
export type QuestionAnswer = string[];

export type PermissionRequest = {
  id: string;
  sessionID: string;
  action: string;
  resources: string[];
  save?: string[];
  message?: string;
  metadata?: Record<string, unknown>;
};

export type WebSearchProvider = { id: string; name: string };

export type WebSearchRequest = {
  id: string;
  sessionID: string;
  title: string;
  specific: boolean;
  options: Array<{ label: string; value: string; description?: string }>;
  metadata?: Record<string, unknown>;
};

export type EventProperties = Record<string, unknown> & {
  sessionID?: string;
};

export type Event = {
  type: string;
  id?: string;
  created?: number;
  properties: EventProperties;
};

export type SessionInputAdmitted = {
  id: string;
  sessionID: string;
  prompt: {
    text: string;
    files?: Array<{
      uri: string;
      name?: string;
      source?: { text: string; start: number; end: number };
    }>;
  };
  delivery: "steer" | "queue";
  timeCreated: number;
};
