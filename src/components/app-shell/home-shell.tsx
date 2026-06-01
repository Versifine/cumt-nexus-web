"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Bell,
  Compass,
  FilePlus2,
  Hash,
  Home,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Latest", icon: Home, active: true },
  { label: "Communities", icon: Hash },
  { label: "Explore", icon: Compass },
  { label: "Apply", icon: FilePlus2 },
];

const skeletonRows = [
  { width: "w-3/4", meta: "w-36" },
  { width: "w-2/3", meta: "w-28" },
  { width: "w-5/6", meta: "w-32" },
];

export function HomeShell() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/80 bg-background-soft/70 px-4 py-5 lg:block">
          <Link href="/" className="flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-primary">
              CN
            </div>
            <div>
              <div className="text-sm font-semibold">CUMT Nexus</div>
              <div className="text-xs text-muted-foreground">Campus community</div>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href="/"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  item.active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-muted-foreground">Latest</div>
                <h1 className="truncate text-xl font-semibold tracking-normal md:text-2xl">
                  Campus discussion feed
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" aria-label="Search">
                  <Search className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="size-4" />
                </Button>
                <Button>
                  <Plus className="size-4" aria-hidden="true" />
                  New post
                </Button>
              </div>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-w-0 px-4 py-5 md:px-6"
            >
              <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold">Feed preview</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        App shell is ready for API-backed content.
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                      Skeleton
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {skeletonRows.map((row, index) => (
                    <div key={row.width} className="px-4 py-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
                          <MessageSquare
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <Skeleton className={cn("h-4", row.width)} />
                          <Skeleton className={cn("h-3 bg-muted/70", row.meta)} />
                          <Skeleton className="h-3 w-full max-w-xl bg-muted/50" />
                        </div>
                        <div className="hidden h-8 w-14 rounded-lg border border-border bg-background-soft sm:block" />
                      </div>
                      {index === 0 ? (
                        <div className="mt-4 rounded-lg border border-dashed border-border bg-background-soft px-3 py-2 text-sm text-muted-foreground">
                          No backend data is rendered in this scaffold.
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            <aside className="border-t border-border bg-background-soft/60 px-4 py-5 md:px-6 xl:border-l xl:border-t-0">
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Workspace state</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Design system</span>
                    <span className="text-primary">Ready</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">API client</span>
                    <span className="text-muted-foreground">Next</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Auth flow</span>
                    <span className="text-muted-foreground">Next</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
