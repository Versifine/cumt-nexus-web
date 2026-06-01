import Link from "next/link";

import { RegisterForm } from "@/features/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-primary">
            CN
          </div>
          <div>
            <div className="text-sm font-semibold">CUMT Nexus</div>
            <div className="text-xs text-muted-foreground">Campus community</div>
          </div>
        </Link>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-normal">Create account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a username and password.
            </p>
          </div>

          <RegisterForm />

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
