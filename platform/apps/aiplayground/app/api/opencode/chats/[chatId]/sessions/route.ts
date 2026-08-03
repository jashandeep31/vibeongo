import {
  getOpencodeProjectDirectories,
  getOpencodeServerClient,
  getOpencodeSessionsAcrossProjects,
} from "@/services/opencode-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    const sessions = await getOpencodeSessionsAcrossProjects(chatId);
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
    const body = (await request.json().catch(() => ({}))) as {
      directory?: unknown;
    };
    const directories = await getOpencodeProjectDirectories(chatId);
    const requestedDirectory =
      typeof body.directory === "string" ? body.directory : undefined;
    const directory = requestedDirectory ?? directories[0];

    if (!directory || !directories.includes(directory)) {
      return new Response("OpenCode project directory not found", {
        status: 404,
      });
    }

    const client = getOpencodeServerClient(chatId);
    const result = await client.session.create({
      directory,
      title: "New chat",
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
