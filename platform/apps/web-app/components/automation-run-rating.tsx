"use client";

import { useRateProjectAutomationRun } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import axios from "axios";
import { Loader2, Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export function AutomationRunRating({
  automationId,
  runId,
  currentRating,
  currentFeedback,
}: {
  automationId: string;
  runId: string;
  currentRating: number | null;
  currentFeedback: string | null;
}) {
  const rateRun = useRateProjectAutomationRun();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(currentRating ?? 0);
  const [feedback, setFeedback] = useState(currentFeedback ?? "");
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  if (currentRating !== null) return null;

  const selectRating = (value: number) => {
    setRating(value);
    setFeedback(currentFeedback ?? "");
    setOpen(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && rateRun.isPending) return;
    setOpen(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating < 1 || rating > 5) return;

    try {
      const response = await rateRun.mutateAsync({
        automationId,
        runId,
        rating,
        feedback: feedback.trim() || undefined,
      });
      toast.success(response.message);
      setOpen(false);
    } catch (error) {
      const responseMessage = axios.isAxiosError<{ message?: unknown }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(
        typeof responseMessage === "string"
          ? responseMessage
          : "Could not save your rating.",
      );
    }
  };

  return (
    <>
      <div
        className="flex items-center"
        aria-label="Rate this automation run"
        onMouseLeave={() => setHoveredRating(null)}
      >
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          const selected = value <= (hoveredRating ?? currentRating ?? 0);

          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-amber-500"
              aria-label={`Rate ${value} out of 5`}
              title={`Rate ${value} out of 5`}
              onMouseEnter={() => setHoveredRating(value)}
              onFocus={() => setHoveredRating(value)}
              onBlur={() => setHoveredRating(null)}
              onClick={() => selectRating(value)}
            >
              <Star
                className={selected ? "fill-amber-400 text-amber-400" : ""}
              />
            </Button>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Rate this automation run</DialogTitle>
              <DialogDescription>
                You selected {rating} out of 5. Feedback is optional.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2 py-5">
              <Label htmlFor={`run-feedback-${runId}`}>
                Feedback{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id={`run-feedback-${runId}`}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="What worked well, or what could be improved?"
                maxLength={1000}
                className="min-h-28 resize-y"
                disabled={rateRun.isPending}
              />
              <p className="text-muted-foreground text-xs">
                {feedback.length}/1,000 characters
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={rateRun.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={rateRun.isPending}>
                {rateRun.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                {rateRun.isPending ? "Saving…" : "Save rating"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
