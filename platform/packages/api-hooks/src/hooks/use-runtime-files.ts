import {
  createRuntimeFileEntry,
  deleteRuntimeFileEntry,
  getRuntimeDirectory,
  getRuntimeFile,
  updateRuntimeFile,
  uploadRuntimeFile,
  type RuntimeFileConnection,
} from "@repo/api-client";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type RuntimeFilesConnection = RuntimeFileConnection & {
  instanceId: string;
};

const runtimeFilesKey = (instanceId: string) => [
  "runtime",
  instanceId,
  "files",
];

const runtimeDirectoryKey = (instanceId: string, path?: string) => [
  ...runtimeFilesKey(instanceId),
  "directory",
  path ?? "default",
];

const runtimeDirectoriesKey = (instanceId: string) => [
  ...runtimeFilesKey(instanceId),
  "directory",
];

const runtimeFileKey = (instanceId: string, path: string) => [
  ...runtimeFilesKey(instanceId),
  "file",
  path,
];

function hasConnection(connection: RuntimeFilesConnection) {
  return Boolean(
    connection.instanceId &&
    connection.runtimeUrl &&
    connection.localToken &&
    connection.accessToken,
  );
}

export function useRuntimeDirectory(
  connection: RuntimeFilesConnection,
  path?: string,
) {
  return useQuery({
    queryKey: runtimeDirectoryKey(connection.instanceId, path),
    queryFn: () => getRuntimeDirectory(connection, path),
    enabled: hasConnection(connection),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useRuntimeFile(
  connection: RuntimeFilesConnection,
  path?: string,
) {
  return useQuery({
    queryKey: runtimeFileKey(connection.instanceId, path ?? ""),
    queryFn: () => getRuntimeFile(connection, path!),
    enabled: hasConnection(connection) && Boolean(path),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateRuntimeFileEntry(connection: RuntimeFilesConnection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => createRuntimeFileEntry(connection, path),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: runtimeDirectoriesKey(connection.instanceId),
      }),
  });
}

export function useUpdateRuntimeFile(connection: RuntimeFilesConnection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      updateRuntimeFile(connection, path, content),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: runtimeFileKey(connection.instanceId, variables.path),
      }),
  });
}

export function useUploadRuntimeFile(connection: RuntimeFilesConnection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, file }: { path: string; file: File }) =>
      uploadRuntimeFile(connection, path, file),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: runtimeDirectoriesKey(connection.instanceId),
      }),
  });
}

export function useDeleteRuntimeFileEntry(connection: RuntimeFilesConnection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => deleteRuntimeFileEntry(connection, path),
    onSuccess: (_, path) => {
      queryClient.removeQueries({
        queryKey: runtimeFileKey(connection.instanceId, path),
      });
      return queryClient.invalidateQueries({
        queryKey: runtimeDirectoriesKey(connection.instanceId),
      });
    },
  });
}
