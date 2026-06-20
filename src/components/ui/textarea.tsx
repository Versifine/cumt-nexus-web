import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "nexus-soft-transition flex min-h-28 w-full resize-y rounded-lg border border-transparent bg-surface-raised px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground",
        "shadow-[inset_0_0_0_1px_var(--input)] hover:bg-surface-hover",
        "focus-visible:border-primary/50 focus-visible:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-destructive/50 aria-invalid:bg-destructive/10 aria-invalid:ring-2 aria-invalid:ring-destructive/25",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
