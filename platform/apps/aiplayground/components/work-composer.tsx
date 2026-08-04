"use client";

import { Button } from "@repo/ui/components/button";
import { projects } from "@repo/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { ArrowUp, Plus } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type ProjectOption = Pick<typeof projects.$inferSelect, "id" | "name">;

type WorkComposerProps = {
  projects: ProjectOption[];
};

export function WorkComposer({ projects }: WorkComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [projectId, setProjectId] = useState<string>();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;

    setMessage("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;

    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <section className="w-full max-w-4xl" aria-labelledby="work-heading">
      <h1
        id="work-heading"
        className="mb-8 text-center text-3xl font-medium tracking-tight sm:text-4xl"
      >
        What should we work on?
      </h1>

      <form ref={formRef} onSubmit={handleSubmit} className="relative pb-14">
        <div className="bg-card focus-within:border-foreground/20 relative z-10 overflow-hidden rounded-[28px] border shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-colors">
          <textarea
            aria-label="Write an AI message"
            placeholder="Work on anything"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            className="placeholder:text-muted-foreground min-h-32 w-full resize-none border-0 bg-transparent px-6 pt-6 pb-3 text-base outline-none sm:min-h-36 sm:text-lg"
          />

          <div className="flex items-center justify-between px-4 pb-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              tabIndex={-1}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              aria-label="Add an attachment"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="size-6" />
            </Button>

            <Button
              type="submit"
              size="icon"
              disabled={!message.trim()}
              className="size-12 rounded-full"
              aria-label="Submit message"
            >
              <ArrowUp className="size-6" strokeWidth={2.5} />
            </Button>
          </div>
        </div>

        <div className="bg-muted absolute inset-x-6 bottom-0 flex h-[80px] items-end rounded-b-[24px] px-4 pb-2.5 sm:inset-x-8">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger
              aria-label="Choose project"
              className="bg-background hover:border-foreground/15 hover:bg-background h-11 max-w-[280px] min-w-[190px] rounded-xl border px-3 shadow-sm transition-all hover:shadow-md focus-visible:ring-2"
            >
              <SelectValue placeholder="Choose a project" />
            </SelectTrigger>
            <SelectContent align="start" className="min-w-[240px] p-1.5">
              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                Your projects
              </div>
              {projects.map((project) => (
                <SelectItem
                  key={project.id}
                  value={project.id}
                  className="min-h-10 rounded-lg pr-8 pl-2"
                >
                  <span className="font-medium">{project.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>
    </section>
  );
}
