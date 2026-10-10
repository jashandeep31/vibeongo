"use client";

import {
  isEditableRuntimeContentType,
  type RuntimeFileEntry,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { File, FileCode2, Loader2, Save, Check, Copy } from "lucide-react";
import { ShikiFileEditor } from "@/components/shiki-file-code";
import { memo } from "react";

export const RuntimeFilePreview = memo(function RuntimeFilePreview({
  isActive,
  isTruncated,
  selectedFile,
  content,
  contentType,
  canEdit,
  isImage,
  isLoading,
  isSaving,
  hasUnsavedChanges,
  copied,
  onContentChange,
  onSave,
  onCopy,
}: {
  isActive: boolean;
  isTruncated: boolean;
  selectedFile: RuntimeFileEntry | null;
  content: string;
  contentType: string;
  canEdit: boolean;
  isImage: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  copied: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCopy: () => void;
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileCode2 className="text-muted-foreground size-4 shrink-0" />
          <span
            className="min-w-0 truncate text-left font-mono text-[11px] [direction:rtl]"
            title={selectedFile?.path}
          >
            {selectedFile?.path ?? "Select a file"}
          </span>
          {hasUnsavedChanges ? (
            <span
              className="size-2 shrink-0 rounded-full bg-amber-500"
              title="Unsaved changes"
            />
          ) : null}
        </div>
        {selectedFile ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Save file"
                aria-label="Save file"
                disabled={!hasUnsavedChanges || isSaving}
                onClick={onSave}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={copied ? "Copied" : "Copy contents"}
                aria-label={copied ? "Copied" : "Copy file contents"}
                onClick={onCopy}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-zinc-950 text-zinc-100">
        {isLoading && selectedFile ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400">
            <Loader2 className="size-4 animate-spin" /> Loading file…
          </div>
        ) : selectedFile && canEdit ? (
          <ShikiFileEditor
            key={selectedFile.path}
            isActive={isActive}
            code={content}
            path={selectedFile.path}
            onChange={onContentChange}
          />
        ) : selectedFile && isTruncated ? (
          <div className="p-3">
            <p role="status" className="mb-3 text-xs text-amber-300">
              Large file: showing a limited read-only preview. Open it in the
              terminal to edit.
            </p>
            <pre className="overflow-auto font-mono text-[11px] whitespace-pre">
              {isEditableRuntimeContentType(contentType)
                ? content.slice(0, 65_536).split("\n", 2000).join("\n")
                : "Preview unavailable for this file type."}
            </pre>
          </div>
        ) : selectedFile && isImage ? (
          <div className="flex min-h-full items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${contentType};base64,${content}`}
              alt={selectedFile.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : selectedFile ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center text-zinc-400">
            <File className="mb-3 size-7" />
            <p className="text-sm font-medium text-zinc-200">
              Preview unavailable
            </p>
            <p className="mt-1 max-w-sm text-xs">
              This file type cannot be safely edited in the browser.
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center text-zinc-500">
            <FileCode2 className="mb-3 size-8" />
            <p className="text-sm text-zinc-300">Select a file to preview</p>
            <p className="mt-1 text-xs">
              The file tree stays open as you work.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});
