import {
  parseOpencodeSlashCommand,
  type OpencodeCommand,
} from "@repo/api-client";
import type { QueryClient } from "@tanstack/react-query";

// Commands are cached per directory by useOpencodeCommands; a prompt is a
// command when its name is known in any directory of this server.
export function findCachedOpencodeCommand(
  queryClient: QueryClient,
  chatId: string,
  serverUrl: string,
  text: string,
) {
  const commands = queryClient
    .getQueriesData<OpencodeCommand[]>({
      queryKey: ["opencode", "commands", chatId, serverUrl],
    })
    .flatMap(([, data]) => data ?? []);
  return parseOpencodeSlashCommand(text.trim(), commands);
}
