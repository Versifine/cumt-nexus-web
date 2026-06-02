import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TextAction } from "@/components/ui/text-action";
import { AuthRequired } from "@/features/auth/auth-required";
import { PostForm } from "@/features/post/post-form";

type NewPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: NewPostPageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `在 /${slug} 发起讨论`,
    description: `在 /${slug} 社区发布新的帖子，补充标题和正文后提交。`,
  };
}

export default async function NewPostPage({ params }: NewPostPageProps) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 md:px-6">
        <div className="border-b border-border pb-4">
          <Link
            href={`/communities/${slug}`}
            className="group inline-flex h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft
              className="size-4 transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
            返回 /{slug}
          </Link>
        </div>

        <header className="border-b border-border py-6">
          <div className="font-mono text-xs uppercase text-primary">
            CUMT NEXUS / 发布帖子
          </div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="min-w-0">
              <h1 className="text-5xl font-black leading-[0.95] tracking-normal md:text-6xl">
                发起讨论
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                这条帖子会发布到 /{slug}。标题负责让别人快速判断主题，正文负责把背景、问题或观点讲清楚。
              </p>
            </div>

            <div className="grid grid-cols-2 border border-border text-center">
              <MetricBlock label="社区" value={`/${slug}`} />
              <MetricBlock label="状态" value="待发布" />
            </div>
          </div>
        </header>

        <section className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <AuthRequired
              authenticatedLabel="可以发布帖子"
              title="登录后发起讨论"
              description={`帖子会发布到 /${slug}，并绑定到当前账号。登录后会回到本页继续编辑。`}
            >
              <PostForm slug={slug} />
            </AuthRequired>
          </div>

          <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="sticky top-6 space-y-8">
              <section className="border-b border-border pb-6">
                <h2 className="text-sm font-semibold">发布前确认</h2>
                <div className="mt-3 divide-y divide-border border-y border-border">
                  {[
                    "标题要具体，不写空泛口号。",
                    "正文写清背景、问题或观点。",
                    "内容应属于当前社区的讨论范围。",
                  ].map((item, index) => (
                    <div key={item} className="flex gap-3 py-3 text-sm leading-6">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-b border-border pb-6">
                <h2 className="text-sm font-semibold">发布后</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  发布成功后会直接进入帖子详情页。当前版本暂不支持发布后立即编辑，请在提交前检查标题和正文。
                </p>
              </section>

              <section>
                <h2 className="text-sm font-semibold">其他入口</h2>
                <div className="mt-3 border-y border-border">
                  <TextAction href={`/communities/${slug}`} variant="bar">
                    返回社区
                  </TextAction>
                  <TextAction href="/communities" variant="bar">
                    浏览社区索引
                  </TextAction>
                </div>
              </section>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-border px-3 py-4 last:border-r-0">
      <div className="font-mono text-[11px] uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 truncate text-lg font-black leading-none text-foreground">
        {value}
      </div>
    </div>
  );
}
