"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import {
  getRuntimeChildPath,
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
import { RuntimeFilePreview } from "@/components/runtime-file-preview";
import { RuntimeFileBrowser } from "@/components/runtime-file-tree";
import { Button } from "@repo/ui/components/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@repo/ui/components/resizable";
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
  ArrowLeft,
  Loader2,
  Plus,
  RefreshCw,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  memo,
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
  return <ProjectSessionFilesContent {...props} />;
}

export const ProjectSessionFilesPanel = memo(function ProjectSessionFilesPanel({
  onClose,
  onDirtyChange,
  ...props
}: ProjectSessionFilesPageProps & {
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  return (
    <ProjectSessionFilesContent
      {...props}
      mode="panel"
      onClose={onClose}
      onDirtyChange={onDirtyChange}
    />
  );
});

function ProjectSessionFilesContent({
  projectId,
  projectSessionId,
  sessionId,
  mode = "page",
  onClose,
  onDirtyChange,
}: ProjectSessionFilesPageProps & {
  mode?: "page" | "panel";
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [requestedDirectoryPath, setRequestedDirectoryPath] = useState<
    string | undefined
  >();
  const [selectedFile, setSelectedFile] = useState<RuntimeFileEntry | null>(
    null,
  );
  const [fileContent, setFileContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const fileDraftRef = useRef("");
  const savedFileContentRef = useRef("");
  const dirtyRef = useRef(false);
  const selectionVersionRef = useRef(0);
  const selectedPathRef = useRef<string | null>(null);
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
  const refetchDirectory = directoryQuery.refetch;
  const fileQuery = useRuntimeFile(connection, selectedFile?.path);
  const createEntryMutation = useCreateRuntimeFileEntry(connection);
  const { mutateAsync: updateFile, isPending: isSaving } = useUpdateRuntimeFile(connection);
  const uploadFileMutation = useUploadRuntimeFile(connection);
  const deleteEntryMutation = useDeleteRuntimeFileEntry(connection);
  const isDirectoryLoading = directoryQuery.isFetching;
  const isFileLoading = Boolean(selectedFile) && fileQuery.isPending;
  const isUploading = uploadFileMutation.isPending;
  const isCreating = createEntryMutation.isPending;
  const deletingPath = deleteEntryMutation.isPending
    ? (deleteEntryMutation.variables ?? "")
    : "";
  const projectChatUrl = `/projects/${projectId}/sessions/${projectSessionId}`;
  const chatUrl = sessionId
    ? `${projectChatUrl}/chats/${sessionId}`
    : projectChatUrl;
  const updateDirty = useCallback((dirty: boolean) => {
    if (dirtyRef.current === dirty) return;
    dirtyRef.current = dirty;
    setHasUnsavedChanges(dirty);
  }, []);
  const changeFileContent = useCallback((content: string) => {
    fileDraftRef.current = content;
    updateDirty(content !== savedFileContentRef.current);
  }, [updateDirty]);
  useEffect(
    () => onDirtyChange?.(hasUnsavedChanges),
    [hasUnsavedChanges, onDirtyChange],
  );
  const isImage = fileContentType.startsWith("image/");
  const canEdit = Boolean(
    selectedFile && isEditableRuntimeContentType(fileContentType),
  );

  const clearSelection = useCallback(() => {
    selectionVersionRef.current += 1;
    selectedPathRef.current = null;
    setSelectedFile(null);
    setFileContent("");
    fileDraftRef.current = "";
    savedFileContentRef.current = "";
    updateDirty(false);
    setFileContentType("");
  }, [updateDirty]);

  const confirmDiscard = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm("Discard your unsaved file changes?");
  }, []);

  useEffect(() => {
    const path = directoryQuery.data?.path;
    if (!path || directoryQuery.isPlaceholderData) return;

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
    if (!result || !selectedFile || dirtyRef.current) return;

    const contentType = result.contentType || "application/octet-stream";
    setFileContentType(contentType);
    if (isEditableRuntimeContentType(contentType)) {
      const decoded = decodeContent(result.content);
      setFileContent(decoded);
      fileDraftRef.current = decoded;
      savedFileContentRef.current = decoded;
    } else {
      setFileContent(result.content);
      fileDraftRef.current = result.content;
      savedFileContentRef.current = result.content;
    }
  }, [fileQuery.data, selectedFile]);

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

  const openDirectory = useCallback((path: string) => {
    if (!confirmDiscard()) return;

    setError("");
    setOpeningDirectoryPath(path);
    if (requestedDirectoryPath === path) {
      void refetchDirectory();
    } else {
      setRequestedDirectoryPath(path);
    }
  }, [confirmDiscard, requestedDirectoryPath, refetchDirectory]);

  const openFile = useCallback((entry: RuntimeFileEntry) => {
    if (selectedPathRef.current === entry.path) return;
    if (!confirmDiscard()) return;

    setError("");
    clearSelection();
    selectedPathRef.current = entry.path;
    setSelectedFile(entry);
  }, [clearSelection, confirmDiscard]);

  const saveFile = useCallback(async () => {
    if (!selectedFile || !canEdit || !dirtyRef.current || isSaving) return;

    setError("");
    const submittedContent = fileDraftRef.current;
    const selectionVersion = selectionVersionRef.current;
    try {
      await updateFile({
        path: selectedFile.path,
        content: submittedContent,
      });
      if (selectionVersionRef.current === selectionVersion) {
        savedFileContentRef.current = submittedContent;
        updateDirty(fileDraftRef.current !== submittedContent);
      }
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
    isSaving,
    selectedFile,
    updateFile,
    updateDirty,
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

  const copyContent = useCallback(async () => {
    if (!canEdit) return;
    await navigator.clipboard.writeText(fileDraftRef.current);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }, [canEdit]);

  const sortedEntries = useMemo(
    () => sortRuntimeFileEntries(directory?.entries ?? []),
    [directory?.entries],
  );

  if (!instance && instancesQuery.isPending) {
    return (
      <FilesPageState
        loading
        message="Connecting to runtime files…"
        onClose={onClose}
      />
    );
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
        chatUrl={onClose ? undefined : chatUrl}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <div
        className={`bg-background text-foreground flex ${mode === "panel" ? "h-full" : "h-svh"} min-h-0 w-full flex-col`}
      >
        <header className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium" title={directory?.path}>
            Files
          </h2>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh files"
              title="Refresh files"
              disabled={!directory || isDirectoryLoading}
              onClick={() => {
                if (!confirmDiscard()) return;
                clearSelection();
                setError("");
                void directoryQuery.refetch();
              }}
            >
              <RefreshCw className={isDirectoryLoading ? "animate-spin" : ""} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="New file or folder"
              title="New file or folder"
              disabled={!directory}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus />
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
              variant="ghost"
              size="icon-sm"
              aria-label="Upload file"
              title="Upload file"
              disabled={!directory || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
            </Button>
            {onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close file browser"
                title="Close file browser"
                onClick={() => {
                  if (!confirmDiscard()) return;
                  if (hasUnsavedChanges) clearSelection();
                  onClose();
                }}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="border-destructive/30 bg-destructive/5 text-destructive mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-lg border px-3 py-2 text-sm md:mx-6">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1 break-words">{error}</span>
            <button type="button" onClick={() => setError("")}>
              <span className="sr-only">Dismiss error</span>×
            </button>
          </div>
        ) : null}

        <main className="flex min-h-0 flex-1">
          <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel id="file-tree" defaultSize={mode === "panel" ? "40%" : "30%"} minSize="96px" maxSize="70%">
          <aside className="bg-muted/10 flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            <RuntimeFileBrowser
              key={directory?.path ?? "/"}
              connection={connection}
              path={directory?.path ?? "/"}
              entries={sortedEntries}
              selectedPath={selectedFile?.path}
              isLoading={isDirectoryLoading}
              openingPath={openingDirectoryPath}
              deletingPath={deletingPath}
              onNavigate={openDirectory}
              onSelect={openFile}
              onDelete={setDeleteCandidate}
            />
          </aside>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize file tree and preview" className="hover:bg-ring" />
          <ResizablePanel id="file-preview" defaultSize={mode === "panel" ? "60%" : "70%"} minSize="100px">
          <RuntimeFilePreview
            selectedFile={selectedFile}
            content={fileContent}
            contentType={fileContentType}
            canEdit={canEdit}
            isImage={isImage}
            isLoading={isFileLoading}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            copied={copied}
            onContentChange={changeFileContent}
            onSave={saveFile}
            onCopy={copyContent}
          />
          </ResizablePanel>
          </ResizablePanelGroup>
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
  onClose,
}: {
  loading?: boolean;
  message: string;
  chatUrl?: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {onClose ? (
        <header className="flex h-12 shrink-0 items-center border-b px-3">
          <span className="flex-1 text-sm font-medium">Files</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close file browser"
            onClick={onClose}
          >
            <X />
          </Button>
        </header>
      ) : null}
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
    </div>
  );
}
