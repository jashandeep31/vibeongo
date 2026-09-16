"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm, SubmitHandler } from "react-hook-form";
import { useUpdateProjectFile } from "@/hooks/use-project";

type FormValues = {
  name: string;
  path: string;
  content: string;
};

type EditEnvFileDialogProps = {
  fileId: string;
  initialName: string;
  initialPath: string;
  initialContent: string;
};

const EditEnvFileDialog = ({ fileId, initialName, initialPath, initialContent }: EditEnvFileDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { id } = useParams() as { id: string };
  const { mutate: updateProjectFile, isPending } = useUpdateProjectFile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: initialName,
      path: initialPath,
      content: initialContent,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    updateProjectFile(
      {
        id,
        fileId,
        name: data.name,
        path: data.path,
        content: data.content,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
        },
      }
    );
  };

  // Effect to reset form when initial values change (e.g. file selection changes)
  React.useEffect(() => {
    reset({
      name: initialName,
      path: initialPath,
      content: initialContent,
    });
  }, [initialName, initialPath, initialContent, reset]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      reset({
        name: initialName,
        path: initialPath,
        content: initialContent,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit Environment File</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Edit Environment File</DialogTitle>
          <DialogDescription>Edit your environment file.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">
              File name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. .env.local"
              {...register("name", { required: "File name is required" })}
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="path" className="text-muted-foreground">
              Path
            </Label>
            <Input
              id="path"
              type="text"
              placeholder="e.g. apps/web/"
              {...register("path", { required: "Path is required" })}
            />
            {errors.path && (
              <p className="text-destructive text-xs">{errors.path.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-muted-foreground">
              Content
            </Label>
            <Textarea
              id="content"
              placeholder="File content..."
              className="min-h-37.5 font-mono text-sm"
              {...register("content", { required: "Content is required" })}
            />
            {errors.content && (
              <p className="text-destructive text-xs">
                {errors.content.message}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEnvFileDialog;
