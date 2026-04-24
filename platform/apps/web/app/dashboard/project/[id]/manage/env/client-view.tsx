"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import { FileCode2, FileText, FolderTree } from "lucide-react";

type EnvFile = {
  name: string;
  path: string;
  content?: string;
};

const files: EnvFile[] = [
  {
    name: ".env",
    path: "/workspace/.env",
    content: `NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://app:secret@localhost:5432/vibeongo
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000`,
  },
  {
    name: ".env.local",
    path: "/workspace/.env.local",
    content: `OPENAI_API_KEY=sk-demo-key
GITHUB_TOKEN=ghp_demo_token
SESSION_SECRET=replace-with-a-long-random-secret`,
  },
  {
    name: ".env.production",
    path: "/workspace/.env.production",
  },
  {
    name: ".env.example",
    path: "/workspace/.env.example",
    content: `DATABASE_URL=
REDIS_URL=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=`,
  },
];

export default function ClientView() {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      files
        .filter((file) => file.content !== undefined)
        .map((file) => [file.path, file.content]),
    ),
  );
  const [selectedFileName, setSelectedFileName] = useState(
    files[0]?.name ?? "",
  );
  const selectedFile = useMemo(
    () => files.find((file) => file.name === selectedFileName) ?? files[0],
    [selectedFileName],
  );
  const selectedContent = selectedFile ? (drafts[selectedFile.path] ?? "") : "";
  const lineCount = selectedContent ? selectedContent.split("\n").length : 0;

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!selectedFile) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [selectedFile.path]: event.target.value,
    }));
  };

  return (
    <div className="px-4 py-5 md:px-6 md:py-6">
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="border-b px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-muted text-foreground rounded-lg p-2">
                  <FolderTree className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle>Environment Files</CardTitle>
                  <CardDescription>
                    Review sample env files and edit values in one place.
                  </CardDescription>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid min-h-[620px] lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="bg-background border-b lg:border-r lg:border-b-0">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Files</p>
                <p className="text-muted-foreground text-xs">
                  Pick a file to preview and update.
                </p>
              </div>

              <div className="space-y-1.5 p-2">
                {files.map((file) => {
                  const isActive = file.name === selectedFile?.name;

                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setSelectedFileName(file.name)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-muted border-border"
                          : "hover:bg-muted/60 border-transparent bg-transparent",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileCode2 className="text-muted-foreground h-4 w-4 shrink-0" />
                            <p className="truncate text-sm font-medium">
                              {file.name}
                            </p>
                          </div>
                          <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
                            {file.path}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="bg-background flex min-h-[620px] flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="text-muted-foreground h-4 w-4" />
                    <p className="truncate font-medium">{selectedFile?.name}</p>
                  </div>
                  <p className="text-muted-foreground mt-1 truncate font-mono text-xs">
                    {selectedFile?.path}
                  </p>
                </div>

                <p className="text-muted-foreground text-sm">
                  {lineCount} lines
                </p>
              </div>

              <div className="flex flex-1 flex-col p-3 md:p-5">
                {!selectedFile?.content && !selectedContent ? (
                  <div className="bg-muted/40 mb-3 flex items-start gap-3 rounded-lg border border-dashed px-4 py-3">
                    <div className="bg-background flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
                      <FileCode2 className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Start from scratch</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        This preset intentionally has no `content` key. Add only
                        the values you actually want to save.
                      </p>
                    </div>
                  </div>
                ) : null}

                <Textarea
                  value={selectedContent}
                  onChange={handleContentChange}
                  spellCheck={false}
                  placeholder={`APP_NAME=\nAPI_URL=\nSECRET_KEY=`}
                  className="h-full min-h-[520px] resize-none rounded-lg bg-transparent px-0 py-0 font-mono text-sm leading-6 shadow-none focus-visible:ring-0"
                />
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
