import { Gauge } from "lucide-react";

export default function LimitsPage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl items-center justify-center px-5 md:px-10">
      <div className="text-center">
        <Gauge className="text-muted-foreground mx-auto size-6" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Limits</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Usage limits are coming soon.
        </p>
      </div>
    </div>
  );
}
