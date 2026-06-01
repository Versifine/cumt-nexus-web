import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {action ? <div className="mt-3">{action}</div> : null}
    </Alert>
  );
}
