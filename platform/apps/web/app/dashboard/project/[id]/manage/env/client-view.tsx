"use client";

import { useGetProjectFilesById } from "@/hooks/use-project";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { FileCode2, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AddEnvFileDialog from "@/components/dialogs/add-env-file-dialog";
import EditEnvFileDialog from "@/components/dialogs/edit-env-file-dialog";

export default function ClientView() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? null;
  const { data, isLoading, isError } = useGetProjectFilesById(projectId);

  const files = useMemo(
    () =>
      (data ?? [])
        .map((entry) => ({
          id: entry.projectFiles.id,
          name: entry.projectFiles.name,
          path: entry.projectFiles.path,
          content: entry.projectFileData?.content ?? "",
          version: entry.projectFileData?.version ?? 1,
        }))
        .filter((file) => file.name.startsWith(".env")),
    [data],
  );

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? files[0] ?? null,
    [files, selectedFileId],
  );
  const selectedContent = selectedFile?.content ?? "";
  const lineCount = selectedContent ? selectedContent.split("\n").length : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Environment Files
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Browse environment files saved for this project.
          </p>
        </div>
        <div>
          <AddEnvFileDialog />
        </div>
      </div>

      <div className="bg-background grid min-h-[600px] overflow-hidden rounded-xl border shadow-sm md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b md:border-r md:border-b-0">
          <div className="border-b px-4 py-3 md:py-4">
            <p className="text-sm font-medium">Files</p>
          </div>

          <div className="space-y-1 p-2 md:p-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-lg border px-3 py-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-2 h-3 w-full" />
                  </div>
                ))
              : null}

            {!isLoading && !isError && files.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                No environment files found.
              </div>
            ) : null}

            {!isLoading && isError ? (
              <div className="text-destructive p-4 text-center text-sm">
                Failed to load files.
              </div>
            ) : null}

            {files.map((file) => {
              const isActive = file.id === selectedFile?.id;

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFileId(file.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FileCode2 className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] opacity-80">
                        {file.path}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="bg-muted/10 flex min-h-[600px] flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3 md:px-6 md:py-4">
            <div className="flex items-center gap-2">
              <FileText className="text-muted-foreground h-4 w-4" />
              <p className="text-sm font-medium">
                {selectedFile?.name ?? "No file selected"}
                {selectedFile?.version ? (
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    (v{selectedFile.version})
                  </span>
                ) : null}
              </p>
            </div>
            {selectedFile ? (
              <EditEnvFileDialog
                fileId={selectedFile.id}
                initialName={selectedFile.name}
                initialPath={selectedFile.path}
                initialContent={selectedContent}
              />
            ) : null}
          </div>

          <div className="flex-1 p-4 md:p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : null}

            {!isLoading && selectedFile && !selectedContent ? (
              <div className="bg-background flex items-start gap-3 rounded-lg border px-4 py-4 shadow-sm">
                <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                  <FileCode2 className="text-muted-foreground h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Content unavailable</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    The backend response does not include editable content here
                    yet.
                  </p>
                </div>
              </div>
            ) : null}

            {!isLoading && !selectedFile ? (
              <div className="text-muted-foreground flex h-full min-h-[400px] items-center justify-center text-sm">
                Select a file from the sidebar to view its contents.
              </div>
            ) : null}

            {!isLoading && selectedFile && selectedContent ? (
              <pre className="bg-background text-foreground h-full min-h-[400px] overflow-auto rounded-lg border p-4 font-mono text-sm leading-relaxed shadow-sm">
                <code>{selectedContent}</code>
              </pre>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
