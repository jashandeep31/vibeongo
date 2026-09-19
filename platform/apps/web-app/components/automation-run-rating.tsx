"use client";

import { useRateProjectAutomationRun } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import axios from "axios";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AutomationRunRating({
  automationId,
  runId,
  status,
  currentRating,
}: {
  automationId: string;
  runId: string;
  status: string;
  currentRating: number | null;
}) {
  const rateRun = useRateProjectAutomationRun();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  if (currentRating !== null || (status !== "done" && status !== "failed")) {
    return null;
  }

  const selectRating = async (rating: number) => {
    try {
      const response = await rateRun.mutateAsync({
        automationId,
        runId,
        rating,
      });
      toast.success(response.message);
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
              onClick={() => void selectRating(value)}
              disabled={rateRun.isPending}
            >
              {rateRun.isPending && value === hoveredRating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Star
                  className={selected ? "fill-amber-400 text-amber-400" : ""}
                />
              )}
            </Button>
          );
        })}
      </div>
  );
}
