"use client";

import { updateRegionAmi } from "@/actions/regions-actions";
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
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type RegionAmiDialogProps = {
  regionId: string;
  regionName: string;
  currentAmi: string;
};

export function RegionAmiDialog({
  regionId,
  regionName,
  currentAmi,
}: RegionAmiDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ami, setAmi] = useState(currentAmi.trim());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amiError = ami.trim() ? null : "AMI is required.";

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setAmi(currentAmi.trim());
      setError(null);
    }
  };

  const handleSubmit = () => {
    if (amiError) {
      setError(amiError);
      return;
    }

    startTransition(async () => {
      try {
        await updateRegionAmi(regionId, ami);
        handleOpenChange(false);
        router.refresh();
      } catch (caughtError) {
        console.error(caughtError);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to update region AMI.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Edit AMI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Region AMI</DialogTitle>
          <DialogDescription>
            Set the AMI used for new instances in {regionName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label htmlFor={`region-ami-${regionId}`}>AMI</Label>
          <Input
            id={`region-ami-${regionId}`}
            type="text"
            value={ami}
            onChange={(event) => {
              setAmi(event.target.value);
              setError(null);
            }}
            placeholder="ami-0123456789abcdef0"
          />
          {(error || amiError) && (
            <p className="text-xs text-destructive">{error ?? amiError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || Boolean(amiError)}
          >
            {isPending ? "Saving..." : "Save AMI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
