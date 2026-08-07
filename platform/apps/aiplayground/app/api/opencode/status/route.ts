import { normalizeOpencodeServerUrl } from "@/services/opencode-server";

type OpencodeStatusRequest = {
  runtimeUrl?: unknown;
  token?: unknown;
};

type ToolsStatsResponse = {
  opencode?: {
    running?: unknown;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OpencodeStatusRequest;
    if (typeof body.runtimeUrl !== "string" || typeof body.token !== "string") {
      return new Response("Runtime URL and token are required", { status: 400 });
    }

    const runtimeUrl = normalizeOpencodeServerUrl(body.runtimeUrl);
    if (!new URL(runtimeUrl).hostname.startsWith("3101-")) {
      return new Response("Invalid runtime status URL", { status: 400 });
    }

    const response = await fetch(`${runtimeUrl}/tools-stats`, {
      headers: { authorization: `Bearer ${body.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return new Response("Could not load runtime tool status", { status: 502 });
    }

    const stats = (await response.json()) as ToolsStatsResponse;
    return Response.json({ running: stats.opencode?.running === true });
  } catch (error) {
    console.error("OpenCode status check failed", error);
    return new Response("Could not load OpenCode status", { status: 502 });
  }
}
