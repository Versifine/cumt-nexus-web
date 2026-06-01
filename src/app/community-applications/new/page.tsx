import Link from "next/link";

import { CommunityApplicationForm } from "@/features/community/community-application-form";

export default function NewCommunityApplicationPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/communities"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to communities
        </Link>

        <header className="mt-6 border-b border-border pb-5">
          <div className="text-sm font-medium text-muted-foreground">
            Community application
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">
            Apply for a new board
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Submitted applications enter platform review. Approval creates the
            community and makes you its owner.
          </p>
        </header>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <CommunityApplicationForm />
        </section>
      </div>
    </main>
  );
}
