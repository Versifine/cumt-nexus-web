import { LoadingState } from "@/components/feedback/loading-state";

export function MessageRouteLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground">
      <LoadingState rows={6} />
    </div>
  );
}
