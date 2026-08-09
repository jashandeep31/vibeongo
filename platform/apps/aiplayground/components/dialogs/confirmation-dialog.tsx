"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Input } from "@repo/ui/components/input";

interface ConfirmationDialogProps {
  children?: ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
  lockSeconds?: number;
  requiredConfirmationText?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function ConfirmationControls({
  cancelText,
  confirmText,
  isDestructive,
  lockSeconds,
  onConfirm,
  requiredConfirmationText,
}: Pick<
  ConfirmationDialogProps,
  | "cancelText"
  | "confirmText"
  | "isDestructive"
  | "lockSeconds"
  | "onConfirm"
  | "requiredConfirmationText"
>) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.ceil(lockSeconds ?? 0)),
  );
  const [confirmationText, setConfirmationText] = useState("");
  const confirmationInputId = useId();

  useEffect(() => {
    if (remainingSeconds === 0) return;

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [remainingSeconds]);

  const isLocked = remainingSeconds > 0;
  const isConfirmationTextInvalid =
    requiredConfirmationText !== undefined &&
    confirmationText !== requiredConfirmationText;
  const isConfirmDisabled = isLocked || isConfirmationTextInvalid;

  return (
    <>
      {requiredConfirmationText !== undefined ? (
        <div className="space-y-3 py-1">
          <label
            className="block text-sm leading-6 font-medium"
            htmlFor={confirmationInputId}
          >
            Type <span className="font-mono">{requiredConfirmationText}</span>{" "}
            to confirm
          </label>
          <Input
            id={confirmationInputId}
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            placeholder={requiredConfirmationText}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
      ) : null}
      <AlertDialogFooter
        className={
          requiredConfirmationText !== undefined
            ? "-mx-6 mt-1 -mb-6 px-6 py-5"
            : undefined
        }
      >
        <AlertDialogCancel>{cancelText}</AlertDialogCancel>
        <AlertDialogAction
          disabled={isConfirmDisabled}
          onClick={() => {
            if (!isConfirmDisabled) onConfirm();
          }}
          variant={isDestructive ? "destructive" : "default"}
        >
          {isLocked ? `${confirmText} (${remainingSeconds}s)` : confirmText}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

export function ConfirmationDialog({
  children,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isDestructive = false,
  lockSeconds = 0,
  requiredConfirmationText,
  open,
  onOpenChange,
}: ConfirmationDialogProps) {
  const requiresConfirmationText = requiredConfirmationText !== undefined;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children ? (
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      ) : null}
      <AlertDialogContent
        className={
          requiresConfirmationText ? "gap-6 p-6 sm:max-w-md" : undefined
        }
      >
        <AlertDialogHeader
          className={requiresConfirmationText ? "gap-2" : undefined}
        >
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <ConfirmationControls
          cancelText={cancelText}
          confirmText={confirmText}
          isDestructive={isDestructive}
          lockSeconds={lockSeconds}
          requiredConfirmationText={requiredConfirmationText}
          onConfirm={onConfirm}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
