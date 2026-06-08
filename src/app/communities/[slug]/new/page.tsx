import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import {
  IndexedInfoRow,
  InfoRow,
  MetricBlock,
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { AuthRequired } from "@/features/auth/auth-required";
import { getCommunity } from "@/features/community/api";
import type { Community } from "@/features/community/types";
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
  const community = await getInitialCommunity(slug);

  return (
    <AppShell contextLabel={`发布 /${slug}`}>
      <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
        <div className="min-w-0">
          <TextAction
            direction="back"
            href={`/communities/${encodeURIComponent(slug)}`}
          >
            返回 /{slug}
          </TextAction>

          <section className="mt-3 border border-border bg-background">
            <NewPostHeader community={community} slug={slug} />
          </section>

          <section className="mt-3 border-x border-border bg-background">
            <div className="border-b border-border px-3 py-3 sm:px-4">
              <h2 className="text-sm font-semibold">帖子内容</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                一个编辑面板内完成标题、正文、图片和正文格式。
              </p>
            </div>
            <div className="px-3 sm:px-4">
              <AuthRequired
                title="登录后发起讨论"
                description={`帖子会发布到 /${slug}，并绑定到当前账号。登录后会回到本页继续编辑。`}
              >
                <PostForm slug={slug} />
              </AuthRequired>
            </div>
          </section>
        </div>

        <NewPostRail community={community} slug={slug} />
      </div>
    </AppShell>
  );
}

function NewPostHeader({
  community,
  slug,
}: {
  community?: Community;
  slug: string;
}) {
  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
      <div className="min-w-0">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
            发布帖子
          </h1>
          <p className="mt-1 truncate font-mono text-xs text-primary">/{slug}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusToken>草稿</StatusToken>
          <StatusToken tone="primary">富文本正文</StatusToken>
          {community ? (
            <StatusToken tone={getCommunityStatusTone(community.status)}>
              {formatCommunityStatus(community.status)}
            </StatusToken>
          ) : null}
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {community
            ? `这条帖子会发布到 ${community.name}。标题负责让别人快速判断主题，正文负责把背景、问题或观点讲清楚。`
            : `这条帖子会发布到 /${slug}。标题负责让别人快速判断主题，正文负责把背景、问题或观点讲清楚。`}
        </p>
      </div>

      <div className="grid grid-cols-2 border border-border text-center">
        <MetricBlock
          label="社区"
          value={`/${slug}`}
          valueClassName="mt-1 truncate text-sm font-semibold"
        />
        <MetricBlock
          label="状态"
          value="待发布"
          valueClassName="mt-1 truncate text-sm font-semibold"
        />
      </div>
    </div>
  );
}

function NewPostRail({
  community,
  slug,
}: {
  community?: Community;
  slug: string;
}) {
  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">发布上下文</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="社区" value={`/${slug}`} />
            <InfoRow
              label="名称"
              value={community?.name?.trim() || "暂未读取"}
            />
            <InfoRow
              label="可见性"
              value={
                community
                  ? formatCommunityVisibility(community.visibility)
                  : "公开读取中"
              }
            />
            <InfoRow
              label="状态"
              value={
                community ? formatCommunityStatus(community.status) : "发布时校验"
              }
            />
          </div>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">发布前确认</h2>
          <div className="mt-3 border-y border-border">
            <IndexedInfoRow
              index="01"
              title="标题具体"
              text="用标题说清讨论对象，不写空泛口号。"
            />
            <IndexedInfoRow
              index="02"
              title="正文完整"
              text="背景、问题、观点或需要的帮助要能被直接读懂。"
            />
            <IndexedInfoRow
              index="03"
              title="属于社区"
              text="内容应属于当前社区的讨论范围。"
            />
          </div>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">发布后</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            发布成功后会直接进入帖子详情页。作者可以在详情页继续编辑标题和正文。
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold">其他入口</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <TextAction
              href={`/communities/${encodeURIComponent(slug)}`}
              variant="bar"
            >
              返回 /{slug}
            </TextAction>
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

async function getInitialCommunity(slug: string): Promise<Community | undefined> {
  try {
    const result = await getCommunity(slug, {
      cache: "no-store",
      token: null,
    });

    return result.community;
  } catch {
    return undefined;
  }
}

function formatCommunityVisibility(visibility: string) {
  switch (visibility) {
    case "public":
      return "公开";
    case "restricted":
      return "受限";
    case "private":
      return "私密";
    default:
      return visibility;
  }
}

function formatCommunityStatus(status: string) {
  switch (status) {
    case "active":
      return "已启用";
    case "archived":
      return "已归档";
    case "suspended":
      return "已暂停";
    case "pending":
      return "待审核";
    default:
      return status;
  }
}

function getCommunityStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "active":
      return "success";
    case "archived":
      return "warning";
    case "suspended":
      return "danger";
    default:
      return "default";
  }
}
