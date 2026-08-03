import { getOpencodeServerClient } from "@/services/opencode-server";
import type { FilePartInput, TextPartInput } from "@opencode-ai/sdk/v2/client";

type RouteParams = {
  params: Promise<{ chatId: string; sessionId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { chatId, sessionId } = await params;
    const client = getOpencodeServerClient(chatId);
    const [sessionResult, messagesResult, changesResult] = await Promise.all([
      client.session.get({ sessionID: sessionId }),
      client.session.messages({ sessionID: sessionId, limit: 100 }),
      client.session.diff({ sessionID: sessionId }),
    ]);

    if (sessionResult.error || !sessionResult.data) {
      return new Response("Could not load OpenCode session", { status: 502 });
    }

    if (messagesResult.error) {
      return new Response("Could not load OpenCode messages", { status: 502 });
    }

    if (changesResult.error) {
      return new Response("Could not load OpenCode changes", { status: 502 });
    }

    return Response.json({
      session: sessionResult.data,
      messages: messagesResult.data ?? [],
      changes: changesResult.data ?? [],
    });
  } catch (error) {
    console.error("OpenCode session load failed", error);
    return new Response("OpenCode session load failed", { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { chatId, sessionId } = await params;
    const body = (await request.json()) as {
      text?: unknown;
      attachments?: unknown;
      selection?: unknown;
    };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const attachments = parseImageAttachments(body.attachments);
    const selection = parsePromptSelection(body.selection);

    if (!text && attachments.length === 0) {
      return new Response("Prompt text or an image is required", {
        status: 400,
      });
    }

    const client = getOpencodeServerClient(chatId);
    const parts: Array<TextPartInput | FilePartInput> = [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...attachments.map((attachment) => ({
        type: "file" as const,
        mime: attachment.mimeType,
        filename: attachment.name,
        url: attachment.dataUrl,
      })),
    ];
    const result = await client.session.promptAsync({
      sessionID: sessionId,
      ...(selection.model ? { model: selection.model } : {}),
      ...(selection.variant ? { variant: selection.variant } : {}),
      ...(selection.agent ? { agent: selection.agent } : {}),
      parts,
    });

    if (result.error) {
      return new Response("Could not send OpenCode prompt", { status: 502 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("OpenCode prompt failed", error);
    return new Response("OpenCode prompt failed", { status: 500 });
  }
}

type ImageAttachment = {
  type: "image";
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
};

type ParsedPromptSelection = {
  model?: { providerID: string; modelID: string };
  variant?: string;
  agent?: string;
};

function parseImageAttachments(value: unknown): ImageAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (attachment): attachment is ImageAttachment =>
      typeof attachment === "object" &&
      attachment !== null &&
      "type" in attachment &&
      attachment.type === "image" &&
      "name" in attachment &&
      typeof attachment.name === "string" &&
      "mimeType" in attachment &&
      typeof attachment.mimeType === "string" &&
      attachment.mimeType.startsWith("image/") &&
      "sizeBytes" in attachment &&
      typeof attachment.sizeBytes === "number" &&
      "dataUrl" in attachment &&
      typeof attachment.dataUrl === "string" &&
      attachment.dataUrl.startsWith("data:image/"),
  );
}

function parsePromptSelection(value: unknown): ParsedPromptSelection {
  if (typeof value !== "object" || value === null) return {};

  const selection = value as Record<string, unknown>;
  const modelSlug =
    typeof selection.model === "string" ? selection.model : undefined;
  const separatorIndex = modelSlug?.indexOf("/") ?? -1;
  const model =
    modelSlug && separatorIndex > 0 && separatorIndex < modelSlug.length - 1
      ? {
          providerID: modelSlug.slice(0, separatorIndex),
          modelID: modelSlug.slice(separatorIndex + 1),
        }
      : undefined;

  return {
    model,
    variant:
      typeof selection.variant === "string" ? selection.variant : undefined,
    agent: typeof selection.agent === "string" ? selection.agent : undefined,
  };
}
