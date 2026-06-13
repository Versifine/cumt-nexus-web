import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import {
  IndexedInfoRow,
  InfoRow,
  MetricBlock,
  StatusToken,
} from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { AuthRequired } from "@/features/auth/auth-required";
import { CommunityApplicationForm } from "@/features/community/community-application-form";

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
      <div className="grid grid-cols-1 gap-0 py-4 xl:grid-cols-[minmax(0,1fr)_312px]">
        <div className="min-w-0">
          <section className="border border-border bg-background">
            <ApplicationHeader />
          </section>

          <section className="mt-3 border-x border-border bg-background">
            <div className="border-b border-border px-3 py-3 sm:px-4">
              <h2 className="text-sm font-semibold">申请内容</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                提交后进入平台审核，审核通过才会创建社区。
              </p>
            </div>
            <div className="px-3 sm:px-4">
              <AuthRequired
                title="登录后申请新社区"
                description="社区申请会绑定到当前账号，用于审核、后续维护和负责人设置。登录后会回到本页继续填写申请。"
              >
                <CommunityApplicationForm />
              </AuthRequired>
            </div>
          </section>
        </div>

        <ApplicationRail />
      </div>
    </AppShell>
  );
}

function ApplicationHeader() {
  return (
    <div className="grid gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
          申请社区
        </h1>
        <p className="mt-1 truncate font-mono text-xs text-primary">
          /community-applications/new
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusToken>草稿</StatusToken>
          <StatusToken tone="primary">平台审核</StatusToken>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          这个入口只负责提交社区申请，不承担通知、审核台或普通左侧导航职责。
        </p>
      </div>

      <div className="grid grid-cols-2 border border-border text-center">
        <MetricBlock
          label="流程"
          value="审核制"
          valueClassName="mt-1 truncate text-sm font-semibold"
        />
        <MetricBlock
          label="状态"
          value="待提交"
          valueClassName="mt-1 truncate text-sm font-semibold"
        />
      </div>
    </div>
  );
}

function ApplicationRail() {
  return (
    <aside className="border-t border-border bg-background-soft/45 px-4 py-5 xl:border-l xl:border-t-0">
      <div className="sticky top-20 space-y-5">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">申请上下文</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="入口" value="社区功能" />
            <InfoRow label="提交身份" value="当前账号" />
            <InfoRow label="创建方式" value="审核后创建" />
          </div>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">申请前确认</h2>
          <div className="mt-3 border-y border-border">
            <IndexedInfoRow
              index="01"
              title="主题稳定"
              text="社区主题应能长期承载讨论，不用临时口号。"
            />
            <IndexedInfoRow
              index="02"
              title="名称清楚"
              text="社区名称要让用户一眼知道讨论范围。"
            />
            <IndexedInfoRow
              index="03"
              title="理由完整"
              text="说明谁会使用、为什么需要，以及准备如何维护。"
            />
          </div>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">审核后</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            通过审核后，社区才会出现在公开列表里。被拒绝时需要根据反馈重新调整申请内容。
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold">其他入口</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
            <TextAction href="/" variant="bar">
              信息流首页
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}
