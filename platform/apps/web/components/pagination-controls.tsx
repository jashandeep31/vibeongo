"use client";

import { Button } from "@repo/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  hasNext?: boolean;
  isLoading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export function PaginationControls({
  page,
  hasNext = false,
  isLoading = false,
  onPrevious,
  onNext,
  className,
}: PaginationControlsProps) {
  const hasPrevious = page > 1;

  return (
    <div className={className ?? "flex items-center justify-end gap-2"}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasPrevious || isLoading}
        onClick={onPrevious}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-muted-foreground min-w-16 text-center text-sm">
        Page {page}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasNext || isLoading}
        onClick={onNext}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
