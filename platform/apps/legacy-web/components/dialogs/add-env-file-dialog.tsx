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
import { useCreateProjectFile } from "@/hooks/use-project";

type FormValues = {
  name: string;
  path: string;
  content: string;
};

const AddEnvFileDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { id } = useParams() as { id: string };
  const { mutate: createProjectFile, isPending } = useCreateProjectFile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      path: "",
      content: "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    createProjectFile(
      {
        id,
        name: data.name,
        path: data.path,
        content: data.content,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          reset();
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add Environment File</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Add Environment File</DialogTitle>
          <DialogDescription>Add a new environment file to your project.</DialogDescription>
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

export default AddEnvFileDialog;
