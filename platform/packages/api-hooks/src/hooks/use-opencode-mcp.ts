"use client";

import {
  addOpencodeMcpServer,
  getOpencodeMcpServers,
  toggleOpencodeMcpServer,
  type OpencodeMcpConfig,
} from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Connection = {
  chatId: string;
  serverUrl: string;
  accessToken: string;
  directory: string;
  password?: string;
};

const queryKey = (connection: Connection) => [
  "opencode",
  "mcp",
  connection.chatId,
  connection.serverUrl,
  connection.directory,
];

export function useOpencodeMcpServers(connection: Connection, enabled = true) {
  return useQuery({
    queryKey: queryKey(connection),
    queryFn: () =>
      getOpencodeMcpServers(
        connection.chatId,
        connection.serverUrl,
        connection.accessToken,
        connection.directory,
        connection.password,
      ),
    enabled:
      enabled &&
      !!connection.serverUrl &&
      !!connection.accessToken &&
      !!connection.directory,
    refetchOnMount: "always",
  });
}

export function useAddOpencodeMcpServer(connection: Connection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      config,
    }: {
      name: string;
      config: OpencodeMcpConfig;
    }) =>
      addOpencodeMcpServer(
        connection.chatId,
        connection.serverUrl,
        connection.accessToken,
        connection.directory,
        name,
        config,
        connection.password,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKey(connection) }),
  });
}

export function useToggleOpencodeMcpServer(connection: Connection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      toggleOpencodeMcpServer(
        connection.chatId,
        connection.serverUrl,
        connection.accessToken,
        connection.directory,
        name,
        connection.password,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKey(connection) }),
  });
}
