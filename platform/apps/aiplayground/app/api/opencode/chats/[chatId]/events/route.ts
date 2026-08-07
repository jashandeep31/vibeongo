import {
  getOpencodeProxyAuthorization,
  getOpencodeServerClient,
  getOpencodeServerUrl,
} from "@/services/opencode-server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const client = getOpencodeServerClient(
    chatId,
    getOpencodeServerUrl(request),
    getOpencodeProxyAuthorization(request),
  );
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const subscription = await client.global.event({
          signal: request.signal,
        });

        for await (const event of subscription.stream) {
          if (request.signal.aborted) break;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event.payload)}\n\n`),
          );
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("OpenCode event subscription failed", error);
        }
      } finally {
        try {
          controller.close();
        } catch {
          // The browser may have already closed the stream.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
