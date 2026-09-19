"use client";

import { useCreateProjectAutomationTrigger } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import axios from "axios";
import { Check, Copy, Loader2 } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

type CreatedTrigger = {
  secret: string;
  webhook_url: string;
};

type AutomationProvider = "sentry" | "custom";

export function CreateProjectAutomationTriggerDialog({
  automationId,
  children,
}: {
  automationId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<AutomationProvider>("sentry");
  const [createdTrigger, setCreatedTrigger] = useState<CreatedTrigger | null>(
    null,
  );
  const nameId = useId();
  const createTrigger = useCreateProjectAutomationTrigger();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setName("");
      setProvider("sentry");
      setCreatedTrigger(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await createTrigger.mutateAsync({
        automationId,
        name: name.trim(),
        provider,
      });
      setCreatedTrigger(response.data);
      toast.success("Integration created");
    } catch (error) {
      const message = axios.isAxiosError<{ message?: unknown }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(
        typeof message === "string"
          ? message
          : "Could not create the integration.",
      );
    }
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy the ${label.toLowerCase()}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {createdTrigger ? "Integration created" : "Create integration"}
          </DialogTitle>
          <DialogDescription>
            {createdTrigger
              ? "Save this secret now. It will not be shown again."
              : "Create a webhook integration that can trigger this automation."}
          </DialogDescription>
        </DialogHeader>

        {createdTrigger ? (
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={`${nameId}-url`}>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id={`${nameId}-url`}
                  value={createdTrigger.webhook_url}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy webhook URL"
                  onClick={() =>
                    void copyValue(createdTrigger.webhook_url, "Webhook URL")
                  }
                >
                  <Copy />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${nameId}-secret`}>Webhook token</Label>
              <div className="flex gap-2">
                <Input
                  id={`${nameId}-secret`}
                  value={createdTrigger.secret}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy webhook token"
                  onClick={() =>
                    void copyValue(createdTrigger.secret, "Webhook token")
                  }
                >
                  <Copy />
                </Button>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-xs leading-5">
              Send a POST request to the webhook URL with this header. Do not
              add a <code>Bearer</code> prefix:
              <code className="mt-1 block break-all">
                Authorization: {createdTrigger.secret}
              </code>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-2 py-2">
              <Label htmlFor={nameId}>Integration name</Label>
              <Input
                id={nameId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Sentry production"
                minLength={3}
                maxLength={20}
                disabled={createTrigger.isPending}
                required
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                Use 3–20 characters.
              </p>
            </div>
            <div className="grid gap-2 py-2">
              <Label htmlFor={`${nameId}-provider`}>Provider</Label>
              <Select
                value={provider}
                onValueChange={(value) => {
                  if (value === "sentry" || value === "custom") {
                    setProvider(value);
                  }
                }}
                disabled={createTrigger.isPending}
              >
                <SelectTrigger id={`${nameId}-provider`} className="w-full">
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sentry">Sentry</SelectItem>
                  <SelectItem value="custom">Custom webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createTrigger.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTrigger.isPending}>
                {createTrigger.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                {createTrigger.isPending ? "Creating…" : "Create integration"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {createdTrigger ? (
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              <Check /> Done
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
