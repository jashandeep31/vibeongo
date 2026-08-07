import {
  getOpencodeProxyAuthorization,
  getOpencodeProjects,
  getOpencodeServerUrl,
} from "@/services/opencode-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    const projects = await getOpencodeProjects(
      chatId,
      getOpencodeServerUrl(request),
      getOpencodeProxyAuthorization(request),
    );

    return Response.json(
      projects.map((project) => ({
        id: project.id,
        worktree: project.worktree,
        sandboxes: project.sandboxes,
      })),
    );
  } catch (error) {
    console.error("OpenCode project list failed", error);
    return new Response("Could not load OpenCode projects", { status: 502 });
  }
}
