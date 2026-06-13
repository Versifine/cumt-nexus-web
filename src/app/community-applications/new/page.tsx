import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
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
      <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <section className="border-b border-border bg-background py-4">
            <ApplicationHeader />
          </section>

          <section className="bg-background">
            <div className="border-b border-border py-3">
              <h2 className="text-sm font-semibold">申请内容</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                提交后进入平台审核，审核通过才会创建社区。
              </p>
            </div>
            <div>
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
    <div>
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
          申请社区
        </h1>
        <p className="mt-1 truncate font-mono text-xs text-primary">
          /community-applications/new
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          提交社区主题、URL 标识和维护理由。平台审核通过后才会创建社区。
        </p>
      </div>
    </div>
  );
}

function ApplicationRail() {
  return (
    <aside className="border-t border-border py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">申请上下文</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            申请会绑定当前账号。通过审核后，系统才会创建社区并设置负责人关系。
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">申请前确认</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <li><span className="font-mono text-primary">01</span> 主题应能长期承载讨论。</li>
            <li><span className="font-mono text-primary">02</span> 名称要让用户一眼知道范围。</li>
            <li><span className="font-mono text-primary">03</span> 理由写清使用者、需求和维护方式。</li>
          </ol>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">审核后</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            通过审核后，社区才会出现在公开列表里。被拒绝时需要根据反馈重新调整申请内容。
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold">其他入口</h2>
          <div className="mt-3 flex flex-col border-t border-border">
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
