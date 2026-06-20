import Link from "next/link";
import type { ReactNode } from "react";
import { MailCheck, MessageSquareText, ShieldCheck } from "lucide-react";

import { NexusBrandMark } from "@/components/brand/nexus-brand-mark";
import { StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";

type AuthPageShellProps = {
  action: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  footer: ReactNode;
  title: string;
};

const trustItems = [
  {
    icon: MailCheck,
    label: "矿大邮箱验证",
    text: "注册、登录和找回密码都围绕校园邮箱完成。",
  },
  {
    icon: ShieldCheck,
    label: "账号安全",
    text: "支持修改密码、修改绑定邮箱和退出所有会话。",
  },
  {
    icon: MessageSquareText,
    label: "社区身份",
    text: "同一个账号串联发帖、评论、收藏和消息。",
  },
];

export function AuthPageShell({
  action,
  children,
  description,
  eyebrow,
  footer,
  title,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <Link
            href="/"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex size-10 items-center justify-center border border-border bg-surface text-foreground transition-colors group-hover:border-primary/50 group-hover:bg-surface-hover">
              <NexusBrandMark className="size-6" />
            </span>
            <span>
              <span className="block text-sm font-semibold">CUMT Nexus</span>
              <span className="block text-xs text-muted-foreground">校园社区</span>
            </span>
          </Link>
          {action}
        </header>

        <div className="grid flex-1 items-center py-8 lg:py-10">
          <section className="grid min-w-0 overflow-hidden border border-border bg-surface/40 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div className="relative hidden min-h-[620px] border-r border-border bg-background-soft p-8 lg:block">
              <div className="absolute inset-x-8 top-8 flex items-center justify-between border-b border-border pb-4">
                <StatusToken tone="primary">CAMPUS COMMUNITY</StatusToken>
                <span className="font-mono text-xs text-muted-foreground">AUTH / 2026</span>
              </div>

              <div className="flex h-full flex-col justify-end">
                <div className="max-w-xl">
                  <p className="font-mono text-xs text-primary">账号入口</p>
                  <h2 className="mt-4 max-w-lg text-4xl font-semibold leading-tight tracking-normal">
                    用一个校园身份连接讨论、收藏和消息。
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                    登录区改成更接近成熟社区产品的双栏结构：左侧说明身份和安全边界，右侧集中完成登录或注册。
                  </p>
                </div>

                <div className="mt-10 grid border-y border-border">
                  {trustItems.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="grid grid-cols-[64px_minmax(0,1fr)] border-b border-border py-5 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs text-primary">
                            0{index + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-primary" aria-hidden="true" />
                            <h3 className="text-sm font-semibold">{item.label}</h3>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="min-w-0 bg-background p-5 sm:p-7 lg:p-8">
              <div className="mx-auto w-full max-w-md">
                <div className="border-b border-border pb-5">
                  <p className="font-mono text-xs text-primary">{eyebrow}</p>
                  <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-normal">
                    {title}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>

                <div className="border-b border-border">{children}</div>
                <div className="py-4">{footer}</div>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-border py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>只使用后端已开放的账号能力，不展示未完成入口。</span>
          <TextAction href="/communities">浏览社区</TextAction>
        </footer>
      </div>
    </main>
  );
}
