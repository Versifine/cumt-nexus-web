import Link from "next/link";

import { PostForm } from "@/features/post/post-form";

type NewPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewPostPage({ params }: NewPostPageProps) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href={`/communities/${slug}`}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          返回 /{slug}
        </Link>

        <header className="mt-6 border-b border-border pb-5">
          <div className="text-sm font-medium text-muted-foreground">新帖子</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">
            发起讨论
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            在这个公开社区发布一条可见帖子。
          </p>
        </header>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <PostForm slug={slug} />
        </section>
      </div>
    </main>
  );
}
