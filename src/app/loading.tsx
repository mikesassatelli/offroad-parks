import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-sm font-medium text-muted-foreground">
        Firing up the engine…
      </p>
      <span className="sr-only">Loading</span>
    </div>
  );
}
