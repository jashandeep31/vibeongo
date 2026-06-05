import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

export function ProjectViewSkeleton() {
  return (
    <div className="mx-auto w-full flex-1 space-y-8 p-4 md:p-8">
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
            <Skeleton className="h-8 w-32" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Card>
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
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
