import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "出现了一些问题",
  description,
  action,
}: ErrorStateProps) {
  return (
    <section className="rounded-lg bg-surface-raised p-4" role="status">
      <div className="flex min-w-0 gap-3">
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
