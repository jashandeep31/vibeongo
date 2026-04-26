"use client";

import React, { useState } from "react";
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

type FormValues = {
  name: string;
  path: string;
  content: string;
};

const AddFileDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
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
    console.log("Form data:", data);
    // No saving for now, just logging and closing
    setIsOpen(false);
    reset();
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
        <Button>Add File</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Add File</DialogTitle>
          <DialogDescription>Add a new file to your project.</DialogDescription>
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
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFileDialog;
