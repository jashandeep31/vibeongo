"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import {
  useCreateProjectFile,
  useDeleteProjectFile,
  useGetProjectFilesById,
  useUpdateProjectFile,
} from "@/hooks/use-project";
import type { ProjectFile } from "@/services/project-services";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import axios from "axios";
import {
  AlertCircle,
  ArrowLeft,
  FileCode2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Draft = {
  name: string;
  path: string;
  content: string;
};

const emptyDraft: Draft = { name: ".env", path: ".", content: "" };

function toDraft(file: ProjectFile): Draft {
  return {
    name: file.name,
    path: file.path,
    content: file.projectFileData?.content ?? "",
  };
}

function draftsMatch(left: Draft, right: Draft) {
  return (
    left.name === right.name &&
    left.path === right.path &&
    left.content === right.content
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
  }

  return fallback;
}

export default function EnvironmentFilesView({
  projectId,
}: {
  projectId: string;
}) {
  const filesQuery = useGetProjectFilesById(projectId);
  const createFile = useCreateProjectFile();
  const updateFile = useUpdateProjectFile();
  const deleteFile = useDeleteProjectFile();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);

  const files = useMemo(
    () =>
      (filesQuery.data ?? []).filter((file) => file.name.startsWith(".env")),
    [filesQuery.data],
  );
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const savedDraft = selectedFile ? toDraft(selectedFile) : null;
  const draft = isAdding
    ? newDraft
    : selectedFile
      ? (drafts[selectedFile.id] ?? savedDraft)
      : null;
  const isDirty = Boolean(
    isAdding
      ? !draftsMatch(newDraft, emptyDraft)
      : selectedFile && draft && savedDraft && !draftsMatch(draft, savedDraft),
  );
  const isSaving = createFile.isPending || updateFile.isPending;

  useEffect(() => {
    if (isAdding || filesQuery.isLoading) return;

    if (selectedFileId && files.some((file) => file.id === selectedFileId)) {
      return;
    }

    setSelectedFileId(files[0]?.id ?? null);
  }, [files, filesQuery.isLoading, isAdding, selectedFileId]);

  const updateDraft = (updates: Partial<Draft>) => {
    if (isAdding) {
      setNewDraft((current) => ({ ...current, ...updates }));
      return;
    }

    if (!selectedFile || !draft) return;
    setDrafts((current) => ({
      ...current,
      [selectedFile.id]: { ...draft, ...updates },
    }));
  };

  const selectFile = (fileId: string) => {
    setIsAdding(false);
    setSelectedFileId(fileId);
  };

  const startAdding = () => {
    setIsAdding(true);
    setSelectedFileId(null);
  };

  const resetDraft = () => {
    if (isAdding) {
      setNewDraft(emptyDraft);
      return;
    }

    if (!selectedFile) return;
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedFile.id];
      return next;
    });
  };

  const validateDraft = (value: Draft) => {
    if (!value.name.trim().startsWith(".env")) {
      toast.error("Environment file names must start with .env");
      return false;
    }
    if (!value.path.trim()) {
      toast.error("Add the directory where this file should be placed");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!draft || !validateDraft(draft)) return;

    const input = {
      id: projectId,
      name: draft.name.trim(),
      path: draft.path.trim(),
      content: draft.content,
    };

    try {
      if (isAdding) {
        await createFile.mutateAsync(input);
        const result = await filesQuery.refetch();
        const createdFile = [...(result.data ?? [])]
          .reverse()
          .find((file) => file.name === input.name && file.path === input.path);
        setNewDraft(emptyDraft);
        setIsAdding(false);
        setSelectedFileId(createdFile?.id ?? null);
        toast.success("Environment file added");
        return;
      }

      if (!selectedFile) return;
      await updateFile.mutateAsync({ ...input, fileId: selectedFile.id });
      setDrafts((current) => {
        const next = { ...current };
        delete next[selectedFile.id];
        return next;
      });
      toast.success("Environment file saved");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Environment file could not be saved"),
      );
    }
  };

  const handleDelete = () => {
    if (!fileToDelete) return;

    const deletedFile = fileToDelete;
    setFileToDelete(null);
    deleteFile.mutate(
      { id: projectId, fileId: deletedFile.id },
      {
        onSuccess: () => {
          setDrafts((current) => {
            const next = { ...current };
            delete next[deletedFile.id];
            return next;
          });
          if (selectedFileId === deletedFile.id) setSelectedFileId(null);
          toast.success("Environment file deleted");
        },
        onError: (error) =>
          toast.error(
            getErrorMessage(error, "Environment file could not be deleted"),
          ),
      },
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-4 sm:px-5 sm:py-6">
      <header className="mt-3 flex items-end justify-between gap-3 sm:mt-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Environment files
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Manage the environment files available to this project.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={startAdding}
          disabled={isSaving}
        >
          <Plus />
          <span className="hidden sm:inline">Add file</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </header>

      {filesQuery.isError ? (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle />
          <AlertTitle>Environment files could not be loaded</AlertTitle>
          <AlertDescription>Refresh the page to try again.</AlertDescription>
        </Alert>
      ) : (
        <div className="bg-background mt-5 grid min-w-0 overflow-hidden rounded-xl border shadow-sm md:min-h-[500px] md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b md:border-r md:border-b-0">
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <p className="text-sm font-medium">Files</p>
              <span className="text-muted-foreground text-xs">
                {files.length}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto p-2 md:block md:space-y-1.5 md:overflow-visible">
              {filesQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-12 w-40 shrink-0 rounded-lg md:w-full"
                    />
                  ))
                : null}

              {isAdding ? (
                <button
                  type="button"
                  className="bg-secondary text-secondary-foreground flex min-w-44 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left md:w-full md:min-w-0"
                >
                  <FileCode2 className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {newDraft.name || "New environment file"}
                  </span>
                  {isDirty ? (
                    <span className="bg-primary size-1.5 rounded-full" />
                  ) : null}
                </button>
              ) : null}

              {!filesQuery.isLoading && files.length === 0 && !isAdding ? (
                <div className="w-full px-4 py-7 text-center md:py-10">
                  <FileCode2 className="text-muted-foreground/60 mx-auto size-6" />
                  <p className="mt-2 text-sm font-medium">
                    No environment files
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Add one to configure this project.
                  </p>
                </div>
              ) : null}

              {files.map((file) => {
                const active = !isAdding && file.id === selectedFileId;
                const fileDraft = drafts[file.id];
                const changed = Boolean(
                  fileDraft && !draftsMatch(fileDraft, toDraft(file)),
                );

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => selectFile(file.id)}
                    className={cn(
                      "hover:bg-secondary/60 flex min-w-44 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors md:w-full md:min-w-0",
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <FileCode2 className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {fileDraft?.name || file.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] opacity-75">
                        {fileDraft?.path || file.path}
                      </span>
                    </span>
                    {changed ? (
                      <span
                        className="bg-primary size-1.5 shrink-0 rounded-full"
                        title="Unsaved changes"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-muted/10 flex min-w-0 flex-col">
            {draft ? (
              <>
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {isAdding ? "New environment file" : selectedFile?.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 hidden text-xs sm:block">
                      {isAdding
                        ? "Choose a name, location, and file contents."
                        : `Version ${selectedFile?.projectFileData?.version ?? 1}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isDirty ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetDraft}
                        disabled={isSaving}
                      >
                        <RotateCcw />
                        <span className="hidden sm:inline">Reset</span>
                      </Button>
                    ) : null}
                    {!isAdding && selectedFile ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${selectedFile.name}`}
                        title="Delete environment file"
                        disabled={deleteFile.isPending}
                        onClick={() => setFileToDelete(selectedFile)}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || (!isAdding && !isDirty)}
                    >
                      {isSaving ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Save />
                      )}
                      <span className="hidden sm:inline">
                        {isAdding ? "Create file" : "Save changes"}
                      </span>
                      <span className="sm:hidden">
                        {isAdding ? "Create" : "Save"}
                      </span>
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-4 p-3 sm:p-4 lg:p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="env-file-name">File name</Label>
                      <Input
                        id="env-file-name"
                        value={draft.name}
                        onChange={(event) =>
                          updateDraft({ name: event.target.value })
                        }
                        placeholder=".env.local"
                        autoFocus={isAdding}
                        disabled={isSaving}
                      />
                      <p className="text-muted-foreground hidden text-xs sm:block">
                        Must start with <code>.env</code>.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="env-file-path">Directory</Label>
                      <Input
                        id="env-file-path"
                        value={draft.path}
                        onChange={(event) =>
                          updateDraft({ path: event.target.value })
                        }
                        placeholder="apps/web"
                        disabled={isSaving}
                      />
                      <p className="text-muted-foreground hidden text-xs sm:block">
                        Use <code>.</code> for the repository root.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="env-file-content">Contents</Label>
                      <span className="text-muted-foreground text-xs">
                        {draft.content.split("\n").length} lines
                      </span>
                    </div>
                    <Textarea
                      id="env-file-content"
                      value={draft.content}
                      onChange={(event) =>
                        updateDraft({ content: event.target.value })
                      }
                      placeholder={"DATABASE_URL=...\nAPI_KEY=..."}
                      className="min-h-[240px] resize-y font-mono text-sm leading-6 sm:min-h-[280px] md:min-h-[300px]"
                      spellCheck={false}
                      disabled={isSaving}
                    />
                    <p className="text-muted-foreground text-[11px] sm:text-xs">
                      Values are stored as encrypted project-file content.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground flex min-h-[320px] flex-1 flex-col items-center justify-center px-5 text-center md:min-h-[500px]">
                <FileCode2 className="size-9 opacity-50" />
                <p className="text-foreground mt-4 font-medium">
                  Select or add an environment file
                </p>
                <p className="mt-1 max-w-sm text-sm">
                  Files you choose appear here for quick editing.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-5"
                  onClick={startAdding}
                >
                  <Plus />
                  Add file
                </Button>
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmationDialog
        open={fileToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFileToDelete(null);
        }}
        title="Delete environment file?"
        description={
          fileToDelete
            ? `Delete ${fileToDelete.name}? This cannot be undone.`
            : "This cannot be undone."
        }
        confirmText="Delete file"
        isDestructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
