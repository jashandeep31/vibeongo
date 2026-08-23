"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { CreateProjectSessionDialog } from "@/components/dialogs/create-project-session-dialog";
import { useDeleteProject, useTerminateInstance } from "@repo/api-hooks";
import { instances } from "@repo/db";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Archive,
  Clock3,
  Ellipsis,
  FileCode2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

type IconButtonSize = "icon-xs" | "icon-sm";

export function ProjectActionsDropdown({
  projectId,
  projectName,
  onNavigate,
  onDeleted,
}: {
  projectId: string;
  projectName: string;
  onNavigate?: () => void;
  onDeleted?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const deleteProject = useDeleteProject();
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);

  const handleDelete = () => {
    setIsDeleteConfirmationOpen(false);
    deleteProject.mutate(projectId, {
      onSuccess: () => {
        onDeleted?.();
        if (pathname.startsWith(`/projects/${projectId}`)) router.push("/");
        toast.success("Project deleted");
      },
      onError: (error) => {
        const responseMessage = axios.isAxiosError<{ message?: unknown }>(error)
          ? error.response?.data?.message
          : undefined;
        toast.error(
          typeof responseMessage === "string"
            ? responseMessage
            : "Failed to delete project",
        );
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label={`Actions for ${projectName}`}
            title={`Actions for ${projectName}`}
          >
            {deleteProject.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Ellipsis />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/projects/${projectId}/edit`} onClick={onNavigate}>
              <Pencil />
              Edit project
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/projects/${projectId}/env`} onClick={onNavigate}>
              <FileCode2 />
              Edit environment
            </Link>
          </DropdownMenuItem>
          <CreateProjectSessionDialog
            projectId={projectId}
            projectName={projectName}
          >
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Plus />
              New session
            </DropdownMenuItem>
          </CreateProjectSessionDialog>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={deleteProject.isPending}
            onSelect={() => setIsDeleteConfirmationOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmationDialog
        open={isDeleteConfirmationOpen}
        onOpenChange={setIsDeleteConfirmationOpen}
        title="Delete project?"
        description={`Delete "${projectName}"? This cannot be undone.`}
        confirmText="Delete project"
        isDestructive
        lockSeconds={3}
        requiredConfirmationText="delete"
        onConfirm={handleDelete}
      />
    </>
  );
}

export function SessionActionsDropdown({
  sessionName,
  isArchivePending,
  onArchive,
  triggerSize = "icon-sm",
}: {
  sessionName: string;
  isArchivePending: boolean;
  onArchive: () => void;
  triggerSize?: IconButtonSize;
}) {
  const [isArchiveConfirmationOpen, setIsArchiveConfirmationOpen] =
    useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={triggerSize}
            aria-label={`More options for ${sessionName}`}
            title="Session options"
            disabled={isArchivePending}
          >
            {isArchivePending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Ellipsis />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsArchiveConfirmationOpen(true)}>
            <Archive />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmationDialog
        open={isArchiveConfirmationOpen}
        onOpenChange={setIsArchiveConfirmationOpen}
        title="Archive session?"
        description={`Archive "${sessionName}"? It will be hidden from your active sessions list.`}
        confirmText="Archive"
        onConfirm={() => {
          setIsArchiveConfirmationOpen(false);
          onArchive();
        }}
      />
    </>
  );
}

export function formatTimeRemaining(terminatesAt: string, now: number) {
  const expiresAt = new Date(terminatesAt).getTime();
  if (Number.isNaN(expiresAt)) return "N/A";

  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) return "Expired";

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function InstanceControlsDropdown({
  instance,
  projectId,
  sessionId,
  sessionName,
  triggerSize = "icon-sm",
}: {
  instance: typeof instances.$inferSelect;
  projectId: string;
  sessionId: string;
  sessionName?: string;
  triggerSize?: IconButtonSize;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [isOpen, setIsOpen] = useState(false);
  const [isTerminationConfirmationOpen, setIsTerminationConfirmationOpen] =
    useState(false);
  const terminateInstance = useTerminateInstance(projectId, sessionId);

  useEffect(() => {
    if (!isOpen) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isOpen]);

  return (
    <>
      <DropdownMenu
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) setNow(Date.now());
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={triggerSize}
            aria-label={
              sessionName
                ? `Instance controls for ${sessionName}`
                : "Instance controls"
            }
            title="Instance controls"
            disabled={terminateInstance.isPending}
          >
            {terminateInstance.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Ellipsis />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Instance controls</DropdownMenuLabel>
          <div className="flex items-center gap-2 px-1.5 py-2">
            <Clock3 className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Terminates in</p>
              <p className="font-mono text-sm font-medium tabular-nums">
                {formatTimeRemaining(String(instance.terminates_at), now)}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={terminateInstance.isPending}
            onSelect={() => setIsTerminationConfirmationOpen(true)}
          >
            <Trash2 />
            Terminate now
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmationDialog
        open={isTerminationConfirmationOpen}
        onOpenChange={setIsTerminationConfirmationOpen}
        title="Terminate this instance?"
        description="The running session instance will be terminated immediately. Any unsaved work on the instance may be lost."
        confirmText="Terminate now"
        isDestructive
        onConfirm={() => {
          setIsTerminationConfirmationOpen(false);
          terminateInstance.mutate(instance.id);
        }}
      />
    </>
  );
}
