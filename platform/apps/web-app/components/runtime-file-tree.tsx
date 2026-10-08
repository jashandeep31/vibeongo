"use client";

import {
  getRuntimeFileBreadcrumbs,
  getRuntimeParentPath,
  type RuntimeFileEntry,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { useRuntimeFileSearch, type RuntimeFilesConnection } from "@repo/api-hooks";
import { ChevronRight, File, Folder, Loader2, Search, Trash2, X } from "lucide-react";
import { memo, useState, type ComponentProps } from "react";

const EMPTY_ENTRIES: RuntimeFileEntry[] = [];

export const RuntimeFileBrowser = memo(function RuntimeFileBrowser({
  connection,
  isActive = true,
  ...treeProps
}: Omit<ComponentProps<typeof RuntimeFileTree>, "searchQuery" | "isSearchLoading"> & {
  connection: RuntimeFilesConnection;
  isActive?: boolean;
}) {
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = searchInput.trim();
  const search = useRuntimeFileSearch(connection, searchQuery, treeProps.path, isActive);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex h-10 shrink-0 items-center border-b px-2">
        {search.isFetching ? (
          <Loader2 className="text-muted-foreground absolute top-1/2 left-4 size-3.5 -translate-y-1/2 animate-spin" />
        ) : (
          <Search className="text-muted-foreground absolute top-1/2 left-4 size-3.5 -translate-y-1/2" />
        )}
        <Input
          className="h-7 pr-7 pl-7 text-xs"
          aria-label="Search files"
          placeholder="Search files…"
          spellCheck={false}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        {searchInput ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 rounded-sm p-0.5"
            aria-label="Clear file search"
            onClick={() => setSearchInput("")}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {search.error ? (
        <p role="alert" className="text-destructive px-2 py-1 text-xs">{search.error.message}</p>
      ) : null}
      <div className="min-h-0 flex-1">
        <RuntimeFileTree
          {...treeProps}
          entries={searchQuery ? search.data?.entries ?? EMPTY_ENTRIES : treeProps.entries}
          searchQuery={searchQuery}
          isSearchLoading={search.isFetching}
        />
      </div>
    </div>
  );
});

export const RuntimeFileTree = memo(function RuntimeFileTree({
  path,
  entries,
  selectedPath,
  searchQuery,
  isSearchLoading,
  isLoading,
  openingPath,
  deletingPath,
  onNavigate,
  onSelect,
  onDelete,
}: {
  path: string;
  entries: RuntimeFileEntry[];
  selectedPath?: string;
  searchQuery: string;
  isSearchLoading: boolean;
  isLoading: boolean;
  openingPath: string;
  deletingPath: string;
  onNavigate: (path: string) => void;
  onSelect: (entry: RuntimeFileEntry) => void;
  onDelete: (entry: RuntimeFileEntry) => void;
}) {
  const breadcrumbs = getRuntimeFileBreadcrumbs(path);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b px-1.5">
        <button
          type="button"
          className="hover:bg-muted mr-0.5 rounded-md p-1.5 disabled:opacity-40"
          aria-label="Go back one folder"
          title="Go back one folder"
          disabled={isLoading || path === "/"}
          onClick={() => onNavigate(getRuntimeParentPath(path))}
        >
          {openingPath === getRuntimeParentPath(path) ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ChevronRight className="size-4 rotate-180" />
          )}
        </button>
        {breadcrumbs.slice(-3).map((part) => (
          <div key={part.path} className="flex min-w-0 shrink items-center">
            <ChevronRight className="text-muted-foreground size-3 shrink-0" />
            <button
              type="button"
              className="hover:bg-muted min-w-0 truncate rounded-md px-1 py-1 font-mono text-[11px]"
              disabled={isLoading}
              title={part.path}
              onClick={() => onNavigate(part.path)}
            >
              {openingPath === part.path ? (
                <Loader2 className="inline size-3.5 animate-spin" />
              ) : (
                part.label
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {(isLoading || isSearchLoading) && entries.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-xs">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry) => {
              const selected = selectedPath === entry.path;
              const deleting = deletingPath === entry.path;
              const opening = openingPath === entry.path;
              const label = searchQuery
                ? entry.path.replace(`${path}/`, "")
                : entry.name;

              return (
                <div
                  key={entry.path}
                  className={`group flex min-w-0 items-center rounded-md transition-colors ${selected ? "bg-muted" : "hover:bg-muted/70"}`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1.5 text-left"
                    disabled={isLoading}
                    title={entry.path}
                    onClick={() =>
                      entry.type === "directory"
                        ? onNavigate(entry.path)
                        : onSelect(entry)
                    }
                  >
                    {entry.type === "directory" ? (
                      opening ? (
                        <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-500" />
                      ) : (
                        <Folder className="size-3.5 shrink-0 text-amber-500" />
                      )
                    ) : (
                      <File className="text-muted-foreground size-3.5 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-left font-mono text-[11px] [direction:rtl]">
                      {label}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                    disabled={Boolean(deletingPath)}
                    aria-label={`Delete ${entry.name}`}
                    onClick={() => onDelete(entry)}
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
            {!isLoading && !isSearchLoading && entries.length === 0 ? (
              <p className="text-muted-foreground px-2 py-8 text-center text-xs">
                {searchQuery ? "No files found." : "This folder is empty."}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
});
