import {
  getOpencodeProjectDirectories,
  getOpencodeServerClient,
  getOpencodeServerUrl,
  getOpencodeSessionsAcrossProjects,
} from "@/services/opencode-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    const sessions = await getOpencodeSessionsAcrossProjects(
      chatId,
      getOpencodeServerUrl(request),
    );
    return Response.json(sessions);
  } catch (error) {
    console.error("OpenCode session list failed", error);
    return new Response("Could not load OpenCode sessions", { status: 502 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    const serverUrl = getOpencodeServerUrl(request);
    const body = (await request.json().catch(() => ({}))) as {
      directory?: unknown;
    };
    const requestedDirectory =
      typeof body.directory === "string" ? body.directory : undefined;
    if (
      requestedDirectory &&
      !/^\/home\/ubuntu\/code\/[A-Za-z0-9._-]+$/.test(requestedDirectory)
    ) {
      return new Response("Invalid repository directory", { status: 400 });
    }

    const directory =
      requestedDirectory ??
      (await getOpencodeProjectDirectories(chatId, serverUrl))[0];

    if (!directory) {
      return new Response("OpenCode project directory not found", {
        status: 404,
      });
    }

    const client = getOpencodeServerClient(chatId, serverUrl, directory);
    const result = await client.session.create({
      directory,
    });

    if (result.error || !result.data) {
      return new Response("Could not create OpenCode session", {
        status: 502,
      });
    }

    return Response.json(result.data, { status: 201 });
  } catch (error) {
    console.error("OpenCode session creation failed", error);
    return new Response("Could not create OpenCode session", { status: 502 });
  }
}
