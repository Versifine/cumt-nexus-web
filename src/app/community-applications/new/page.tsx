import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import {
  ReviewDesk,
  ReviewDeskBoard,
  ReviewDeskInspector,
} from "@/components/app-shell/review-desk";
import { AuthRequired } from "@/features/auth/auth-required";
import { CommunityApplicationForm } from "@/features/community/community-application-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "申请新社区",
  description: "提交 CUMT Nexus 社区申请，说明新社区的使用场景和维护方式。",
};

export default function NewCommunityApplicationPage() {
  return (
    <AppShell
      backTarget={{
        href: "/communities",
        label: "浏览社区",
      }}
      contextLabel="社区申请"
    >
      <ReviewDesk className="max-w-[1120px]">
        <ApplicationHeader />
        <ReviewDeskBoard
          className="xl:grid-cols-[minmax(0,1fr)_320px]"
          inspector={<ApplicationRail />}
        >
          <section className="min-w-0 rounded-lg bg-surface px-4 py-4 sm:px-5">
            <AuthRequired
              title="登录后申请新社区"
              description="社区申请会绑定到当前账号，用于审核、后续维护和版主设置。登录后会回到本页继续填写申请。"
            >
              <CommunityApplicationForm />
            </AuthRequired>
          </section>
        </ReviewDeskBoard>
      </ReviewDesk>
    </AppShell>
  );
}

function ApplicationHeader() {
  return (
    <header className="flex min-w-0 flex-col gap-3 py-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="font-mono text-[11px] font-semibold uppercase text-primary">
          /community-applications/new
        </div>
        <h1 className="mt-1 text-2xl font-semibold leading-8 tracking-normal text-foreground">
          申请社区
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          提交社区主题、URL 标识和维护理由。平台审核通过后才会创建社区。
        </p>
      </div>
      <RailActionLink className="shrink-0 px-0" href="/communities">
        浏览社区
      </RailActionLink>
    </header>
  );
}

function ApplicationRail() {
  return (
    <div className="space-y-4">
      <ReviewDeskInspector
        title="申请上下文"
        description="申请会绑定当前账号。通过审核后，系统才会创建社区并设置版主关系。"
      />

      <ReviewDeskInspector title="申请前确认">
        <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
          <RailChecklistItem index="01">
            主题应能长期承载讨论，不只服务一次活动。
          </RailChecklistItem>
          <RailChecklistItem index="02">
            名称要让用户一眼知道范围，URL 标识保持短且稳定。
          </RailChecklistItem>
          <RailChecklistItem index="03">
            理由写清使用者、需求和基础维护方式。
          </RailChecklistItem>
        </ol>
      </ReviewDeskInspector>

      <ReviewDeskInspector
        title="审核后"
        description="通过审核后，社区才会出现在公开列表里。被拒绝时需要根据反馈重新调整申请内容。"
      />

      <ReviewDeskInspector title="其他入口">
        <div className="space-y-1">
          <RailActionLink href="/communities">浏览社区</RailActionLink>
          <RailActionLink href="/">信息流首页</RailActionLink>
        </div>
      </ReviewDeskInspector>
    </div>
  );
}

function RailChecklistItem({
  children,
  index,
}: {
  children: ReactNode;
  index: string;
}) {
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-2">
      <span className="font-mono text-[11px] text-primary">{index}</span>
      <span>{children}</span>
    </li>
  );
}

function RailActionLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-10 items-center justify-between gap-3 rounded-md px-1.5 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowRight
        className="size-4 text-muted-foreground transition duration-150 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}
