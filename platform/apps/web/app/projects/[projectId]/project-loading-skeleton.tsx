import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

const InstanceCardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid gap-3 text-sm md:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-36" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </CardContent>
  </Card>
);

const SessionCardSkeleton = () => (
  <Card className="flex flex-col">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full max-w-72" />
    </CardHeader>
    <CardContent className="flex-1 pb-4">
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </CardContent>
    <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-t px-6 py-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-9" />
      <Skeleton className="h-9 w-9" />
    </div>
  </Card>
);

export function ProjectLoadingSkeleton() {
  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-9 w-64 max-w-full" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-36" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-28" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <InstanceCardSkeleton key={item} />
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-full max-w-sm" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <SessionCardSkeleton key={item} />
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  );
}
