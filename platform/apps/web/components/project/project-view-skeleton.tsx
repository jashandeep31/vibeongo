import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

export function ProjectViewSkeleton() {
  return (
    <div className="mx-auto w-full flex-1 space-y-8 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="space-y-6 lg:w-3/4">
          <div className="space-y-4">
            <Skeleton className="h-7 w-48" />
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-8 w-40" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-9 w-32" />
              </div>
              <div className="mt-5 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex gap-2 border-b pb-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
            <Card>
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6 lg:w-1/4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
