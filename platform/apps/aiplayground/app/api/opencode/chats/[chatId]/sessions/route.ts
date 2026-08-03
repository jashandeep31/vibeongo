import { getOpencodeServerClient } from "@/services/opencode-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    const client = getOpencodeServerClient(chatId);
    const result = await client.session.list({ roots: true, limit: 100 });

    if (result.error) {
      return new Response("Could not load OpenCode sessions", { status: 502 });
    }

    return Response.json(result.data ?? []);
  } catch (error) {
    console.error("OpenCode session list failed", error);
    return new Response("OpenCode session list failed", { status: 500 });
  }
}
