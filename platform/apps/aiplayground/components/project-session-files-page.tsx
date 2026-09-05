"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { FileManagementSidebar } from "@/components/file-management-sidebar";
import {
  getRuntimeChildPath,
  getRuntimeFileBreadcrumbs,
  getRuntimeParentPath,
  isEditableRuntimeContentType,
  sortRuntimeFileEntries,
  type RuntimeFileEntry,
} from "@repo/api-client";
import {
  useCreateRuntimeFileEntry,
  useDeleteRuntimeFileEntry,
  useGetInstances,
  useRuntimeDirectory,
  useRuntimeFile,
  useUpdateRuntimeFile,
  useUploadRuntimeFile,
  type RuntimeFilesConnection,
} from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@repo/ui/components/sidebar-v2";
import { Textarea } from "@repo/ui/components/textarea";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Ellipsis,
  File,
  FileCode2,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";

function getConfigValue(config: unknown, key: string) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function decodeContent(content: string) {
  const binary = window.atob(content);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

type ProjectSessionFilesPageProps = {
  projectId: string;
  projectSessionId: string;
  sessionId?: string;
};

export function ProjectSessionFilesPage(props: ProjectSessionFilesPageProps) {
  return (
    <SidebarProvider defaultOpen={false} className="min-h-0!">
      <ProjectSessionFilesContent {...props} />
    </SidebarProvider>
  );
}

function ProjectSessionFilesContent({
  projectId,
  projectSessionId,
  sessionId,
}: ProjectSessionFilesPageProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [requestedDirectoryPath, setRequestedDirectoryPath] = useState<
    string | undefined
  >();
  const [pathInput, setPathInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<RuntimeFileEntry | null>(
    null,
  );
  const [fileContent, setFileContent] = useState("");
  const [savedFileContent, setSavedFileContent] = useState("");
  const [fileContentType, setFileContentType] = useState("");
  const [openingDirectoryPath, setOpeningDirectoryPath] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEntryName, setNewEntryName] = useState("");
  const [deleteCandidate, setDeleteCandidate] =
    useState<RuntimeFileEntry | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedDirectoryPathRef = useRef("");

  const storedInstance = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.instance,
  );
  const instancesQuery = useGetInstances(
    { sessionId: projectSessionId, state: "running", limit: 1 },
    !storedInstance,
  );
  const instance = storedInstance ?? instancesQuery.data?.data[0];
  const connection = useMemo<RuntimeFilesConnection>(
    () => ({
      instanceId: instance?.id ?? "",
      runtimeUrl: instance
        ? `https://3101-${instance.id}${instance.proxy_domain}`
        : "",
      localToken: getConfigValue(instance?.config, "vibeongoLocalToken"),
      accessToken: instance?.access_token ?? "",
    }),
    [instance],
  );
  const isConnected = Boolean(
    connection.instanceId &&
    connection.runtimeUrl &&
    connection.localToken &&
    connection.accessToken,
  );
  const directoryQuery = useRuntimeDirectory(
    connection,
    requestedDirectoryPath,
  );
  const directory = directoryQuery.data ?? null;
  const fileQuery = useRuntimeFile(connection, selectedFile?.path);
  const createEntryMutation = useCreateRuntimeFileEntry(connection);
  const updateFileMutation = useUpdateRuntimeFile(connection);
  const uploadFileMutation = useUploadRuntimeFile(connection);
  const deleteEntryMutation = useDeleteRuntimeFileEntry(connection);
  const isDirectoryLoading = directoryQuery.isFetching;
  const isFileLoading = fileQuery.isFetching;
  const isSaving = updateFileMutation.isPending;
  const isUploading = uploadFileMutation.isPending;
  const isCreating = createEntryMutation.isPending;
  const deletingPath = deleteEntryMutation.isPending
    ? (deleteEntryMutation.variables ?? "")
    : "";
  const projectChatUrl = `/projects/${projectId}/chats/${projectSessionId}`;
  const chatUrl = sessionId
    ? `${projectChatUrl}/sessions/${sessionId}`
    : projectChatUrl;
  const hasUnsavedChanges =
    Boolean(selectedFile) && fileContent !== savedFileContent;
  const isImage = fileContentType.startsWith("image/");
  const canEdit = Boolean(
    selectedFile && isEditableRuntimeContentType(fileContentType),
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setFileContent("");
    setSavedFileContent("");
    setFileContentType("");
  }, []);

  const confirmDiscard = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    return window.confirm("Discard your unsaved file changes?");
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const path = directoryQuery.data?.path;
    if (!path || directoryQuery.isPlaceholderData) return;

    setPathInput(path);
    setOpeningDirectoryPath("");
    if (loadedDirectoryPathRef.current !== path) {
      loadedDirectoryPathRef.current = path;
      clearSelection();
    }
  }, [
    clearSelection,
    directoryQuery.data?.path,
    directoryQuery.isPlaceholderData,
  ]);

  useEffect(() => {
    if (!directoryQuery.isFetching) setOpeningDirectoryPath("");
  }, [directoryQuery.isFetching]);

  useEffect(() => {
    if (directoryQuery.error) setError(directoryQuery.error.message);
  }, [directoryQuery.error]);

  useEffect(() => {
    const result = fileQuery.data;
    if (!result || !selectedFile || hasUnsavedChanges) return;

    const contentType = result.contentType || "application/octet-stream";
    setFileContentType(contentType);
    if (isEditableRuntimeContentType(contentType)) {
      const decoded = decodeContent(result.content);
      setFileContent(decoded);
      setSavedFileContent(decoded);
    } else {
      setFileContent(result.content);
      setSavedFileContent(result.content);
    }
  }, [fileQuery.data, hasUnsavedChanges, selectedFile]);

  useEffect(() => {
    if (fileQuery.error) setError(fileQuery.error.message);
  }, [fileQuery.error]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) =>
      event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const openDirectory = (path: string) => {
    if (!confirmDiscard()) return;

    setError("");
    setOpeningDirectoryPath(path);
    if (requestedDirectoryPath === path) {
      void directoryQuery.refetch();
    } else {
      setRequestedDirectoryPath(path);
    }
  };

  const openFile = (entry: RuntimeFileEntry) => {
    if (!confirmDiscard()) return;

    setError("");
    setSelectedFile(entry);
    setFileContent("");
    setSavedFileContent("");
    setFileContentType("");
    if (isMobile) setOpenMobile(false);
  };

  const saveFile = useCallback(async () => {
    if (!selectedFile || !canEdit || !hasUnsavedChanges || isSaving) return;

    setError("");
    try {
      await updateFileMutation.mutateAsync({
        path: selectedFile.path,
        content: fileContent,
      });
      setSavedFileContent(fileContent);
      toast.success(`${selectedFile.name} saved`);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not save file";
      setError(message);
      toast.error(message);
    }
  }, [
    canEdit,
    fileContent,
    hasUnsavedChanges,
    isSaving,
    selectedFile,
    updateFileMutation,
  ]);

  useEffect(() => {
    const saveWithKeyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveFile();
      }
    };
    window.addEventListener("keydown", saveWithKeyboard);
    return () => window.removeEventListener("keydown", saveWithKeyboard);
  }, [saveFile]);

  const createEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!directory || !newEntryName.trim()) return;

    setError("");
    try {
      const isDirectory = newEntryName.trim().endsWith("/");
      const targetPath = getRuntimeChildPath(directory.path, newEntryName);
      await createEntryMutation.mutateAsync(targetPath);
      toast.success(`${isDirectory ? "Folder" : "File"} created`);
      setIsCreateDialogOpen(false);
      setNewEntryName("");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not create item";
      setError(message);
      toast.error(message);
    }
  };

  const uploadFile = async (file: File) => {
    if (!directory) return;
    setError("");
    try {
      await uploadFileMutation.mutateAsync({
        path: directory.path,
        file,
        fileName: file.name,
      });
      toast.success(`${file.name} uploaded`);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not upload file";
      setError(message);
      toast.error(message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteEntry = async () => {
    if (!deleteCandidate || !directory) return;
    const target = deleteCandidate;
    setDeleteCandidate(null);
    setError("");
    try {
      await deleteEntryMutation.mutateAsync(target.path);
      if (selectedFile?.path === target.path) clearSelection();
      toast.success(`${target.name} deleted`);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not delete item";
      setError(message);
      toast.error(message);
    }
  };

  const copyContent = async () => {
    if (!canEdit) return;
    await navigator.clipboard.writeText(fileContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  const sortedEntries = useMemo(
    () => sortRuntimeFileEntries(directory?.entries ?? []),
    [directory?.entries],
  );

  const breadcrumbs = useMemo(
    () => getRuntimeFileBreadcrumbs(directory?.path),
    [directory?.path],
  );

  const directoryPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b px-2">
        <button
          type="button"
          className="hover:bg-muted mr-1 rounded-md p-1.5 disabled:opacity-40"
          aria-label="Go back one folder"
          title="Go back one folder"
          disabled={isDirectoryLoading || directory?.path === "/"}
          onClick={() =>
            openDirectory(getRuntimeParentPath(directory?.path ?? "/"))
          }
        >
          {openingDirectoryPath ===
          getRuntimeParentPath(directory?.path ?? "/") ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowLeft className="size-4" />
          )}
        </button>
        {breadcrumbs.length > 3 ? (
          <div className="text-muted-foreground flex shrink-0 items-center">
            <ChevronRight className="size-3" />
            <Ellipsis
              className="mx-1 size-4"
              aria-label="Earlier folders hidden"
            />
          </div>
        ) : null}
        {breadcrumbs.slice(-3).map((part) => (
          <div key={part.path} className="flex shrink-0 items-center">
            <ChevronRight className="text-muted-foreground size-3" />
            <button
              type="button"
              className="hover:bg-muted rounded-md px-1.5 py-1 font-mono text-xs"
              disabled={isDirectoryLoading}
              onClick={() => openDirectory(part.path)}
            >
              {openingDirectoryPath === part.path ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                part.label
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isDirectoryLoading && !directory ? (
          <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-0.5">
            {sortedEntries.map((entry) => {
              const selected = selectedFile?.path === entry.path;
              const deleting = deletingPath === entry.path;
              const opening = openingDirectoryPath === entry.path;
              return (
                <div
                  key={entry.path}
                  className={`group flex items-center rounded-md transition-colors ${
                    selected ? "bg-muted" : "hover:bg-muted/70"
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
                    disabled={isDirectoryLoading}
                    onClick={() =>
                      entry.type === "directory"
                        ? openDirectory(entry.path)
                        : openFile(entry)
                    }
                  >
                    {entry.type === "directory" ? (
                      opening ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-amber-500" />
                      ) : (
                        <Folder className="size-4 shrink-0 text-amber-500" />
                      )
                    ) : (
                      <File className="text-muted-foreground size-4 shrink-0" />
                    )}
                    <span className="truncate font-mono text-xs">
                      {entry.name}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive mr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                    disabled={Boolean(deletingPath)}
                    aria-label={`Delete ${entry.name}`}
                    onClick={() => setDeleteCandidate(entry)}
                  >
                    {deleting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </div>
              );
            })}
            {!isDirectoryLoading && sortedEntries.length === 0 ? (
              <p className="text-muted-foreground px-3 py-10 text-center text-sm">
                This folder is empty.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  if (!instance && instancesQuery.isPending) {
    return <FilesPageState loading message="Connecting to runtime files…" />;
  }

  if (!instance || !isConnected) {
    return (
      <FilesPageState
        message={
          instancesQuery.isError
            ? "Could not load the runtime."
            : !instance
              ? "Resume this project session to manage its files."
              : "Runtime credentials are unavailable."
        }
        chatUrl={chatUrl}
      />
    );
  }

  return (
    <>
      {isMobile ? (
        <FileManagementSidebar currentPath={directory?.path}>
          {directoryPanel}
        </FileManagementSidebar>
      ) : null}
      <div className="bg-background text-foreground flex h-svh min-h-0 w-full flex-col">
        <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-2 md:flex-row md:items-center md:px-6">
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              openDirectory(pathInput.trim());
            }}
          >
            <div className="relative min-w-0 flex-1">
              <FolderOpen className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                className="h-8 pl-8 font-mono text-xs"
                aria-label="Directory path"
                spellCheck={false}
                value={pathInput}
                onChange={(event) => setPathInput(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isDirectoryLoading}
            >
              {isDirectoryLoading && !openingDirectoryPath ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Open
            </Button>
            <SidebarTrigger
              type="button"
              className="md:hidden"
              variant="outline"
              aria-label="Open file browser"
              title="Open file browser"
            />
          </form>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!directory || isDirectoryLoading}
              onClick={() => {
                if (!confirmDiscard()) return;
                clearSelection();
                setError("");
                void directoryQuery.refetch();
              }}
            >
              <RefreshCw className={isDirectoryLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!directory}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus /> New
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!directory || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
              Upload
            </Button>
          </div>
        </div>

        {error ? (
          <div className="border-destructive/30 bg-destructive/5 text-destructive mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-lg border px-3 py-2 text-sm md:mx-6">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1 break-words">{error}</span>
            <button type="button" onClick={() => setError("")}>
              <span className="sr-only">Dismiss error</span>×
            </button>
          </div>
        ) : null}

        <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 md:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="bg-muted/10 hidden min-h-0 flex-col overflow-hidden border-r md:flex">
            {directoryPanel}
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileCode2 className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate font-mono text-xs">
                  {selectedFile?.path ?? "Select a file"}
                </span>
                {hasUnsavedChanges ? (
                  <span
                    className="size-2 shrink-0 rounded-full bg-amber-500"
                    title="Unsaved changes"
                  />
                ) : null}
                {fileContentType ? (
                  <Badge
                    variant="secondary"
                    className="hidden font-mono sm:flex"
                  >
                    {fileContentType}
                  </Badge>
                ) : null}
              </div>
              {selectedFile ? (
                <div className="flex shrink-0 items-center gap-1">
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!hasUnsavedChanges || isSaving}
                      onClick={() => void saveFile()}
                    >
                      {isSaving ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Save />
                      )}
                      Save
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyContent()}
                    >
                      {copied ? <Check /> : <Copy />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-zinc-950 text-zinc-100">
              {isFileLoading ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="size-4 animate-spin" /> Loading file…
                </div>
              ) : selectedFile && canEdit ? (
                <Textarea
                  aria-label={`Contents of ${selectedFile.name}`}
                  className="field-sizing-fixed h-full min-h-full resize-none rounded-none border-0 bg-transparent p-4 font-mono text-xs leading-5 text-zinc-100 focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                  spellCheck={false}
                  value={fileContent}
                  onChange={(event) => setFileContent(event.target.value)}
                />
              ) : selectedFile && isImage ? (
                <div className="flex min-h-full items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${fileContentType};base64,${fileContent}`}
                    alt={selectedFile.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : selectedFile ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-zinc-400">
                  <File className="mb-3 size-8" />
                  <p className="text-sm font-medium text-zinc-200">
                    Preview unavailable
                  </p>
                  <p className="mt-1 max-w-sm text-xs">
                    This file type cannot be safely edited in the browser.
                  </p>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-zinc-500">
                  <FileCode2 className="mb-3 size-9" />
                  <p className="text-sm text-zinc-300">
                    Select a file to preview or edit
                  </p>
                  <p className="mt-1 text-xs">
                    Text files can be saved with Ctrl or ⌘ + S.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>

        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            if (!isCreating) {
              setIsCreateDialogOpen(open);
            }
            if (!open && !isCreating) {
              setNewEntryName("");
            }
          }}
        >
          <DialogContent>
            <form onSubmit={createEntry}>
              <DialogHeader>
                <DialogTitle>Create file or folder</DialogTitle>
                <DialogDescription>
                  Add it inside{" "}
                  <span className="font-mono">{directory?.path}</span>. End the
                  name with <span className="font-mono">/</span> to create a
                  folder; otherwise, a file will be created.
                </DialogDescription>
              </DialogHeader>
              <Input
                className="mt-4 font-mono"
                autoFocus
                aria-label="Name"
                placeholder="src/index.ts or src/components/"
                spellCheck={false}
                value={newEntryName}
                onChange={(event) => setNewEntryName(event.target.value)}
              />
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isCreating}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={!newEntryName.trim() || isCreating}
                >
                  {isCreating ? <Loader2 className="animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmationDialog
          open={Boolean(deleteCandidate)}
          onOpenChange={(open) => {
            if (!open) setDeleteCandidate(null);
          }}
          title={`Delete ${deleteCandidate?.name ?? "item"}?`}
          description={
            deleteCandidate?.type === "directory"
              ? "This folder and everything inside it will be permanently deleted."
              : "This file will be permanently deleted."
          }
          confirmText="Delete"
          isDestructive
          onConfirm={() => void deleteEntry()}
        />
      </div>
    </>
  );
}

function FilesPageState({
  loading = false,
  message,
  chatUrl,
}: {
  loading?: boolean;
  message: string;
  chatUrl?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="bg-muted flex size-11 items-center justify-center rounded-full">
          {loading ? (
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          ) : (
            <TriangleAlert className="text-destructive size-5" />
          )}
        </div>
        <div className="space-y-1">
          <h1 className="font-medium">
            {loading ? "Loading File Manager" : "Runtime unavailable"}
          </h1>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        {chatUrl ? (
          <Button asChild>
            <Link href={chatUrl}>
              <ArrowLeft /> Back to chat
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
