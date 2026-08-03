"use client";

import { useOpencodeSession } from "@/hooks/use-opencode-session";
import { playgroundProjects } from "@/lib/playground-projects";
import { useParams } from "next/navigation";

function RawJson({ value }: { value: unknown }) {
  const output = JSON.stringify(value, null, 2).replaceAll("\\n", "\n");

  return <pre className="w-full whitespace-pre-wrap break-words">{output}</pre>;
}

export default function OpencodeSessionPage() {
  const { projectId, chatId, sessionId } = useParams<{
    projectId: string;
    chatId: string;
    sessionId: string;
  }>();
  const project = playgroundProjects.find((item) => item.id === projectId);
  const chat = project?.chats.find((item) => item.id === chatId);
  const { data, error, isPending } = useOpencodeSession({
    chatId,
    serverUrl: chat?.opencodeServerUrl,
    sessionId,
  });

  if (!project || !chat) {
    return <RawJson value={{ error: "Saved chat not found" }} />;
  }

  if (!chat.opencodeServerUrl) {
    return <RawJson value={{ error: "Chat has no OpenCode server" }} />;
  }

  if (isPending) {
    return <RawJson value={{ loading: true }} />;
  }

  if (error) {
    return <RawJson value={{ error: error.message }} />;
  }

  return <RawJson value={data} />;
}
