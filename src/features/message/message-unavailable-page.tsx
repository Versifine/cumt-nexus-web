import {
  Ban,
  Clock3,
  Image as ImageIcon,
  MessageCircle,
  Send,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

import { TextAction } from "@/components/ui/text-action";
import { cn } from "@/lib/utils";

const boxTabs = ["全部", "朋友", "陌生人请求", "已归档"];

const capabilityRows = [
  {
    icon: UserCheck,
    label: "互关直发",
    text: "互关用户可直接进入普通会话；非互关只进入请求箱。",
  },
  {
    icon: Clock3,
    label: "不显示已读",
    text: "后端 read cursor 只用于未读数、排序和打开会话后清未读。",
  },
  {
    icon: ShieldAlert,
    label: "治理风控",
    text: "陌生人首条限流、广告和联系方式刷屏过滤、举报只提交有限上下文。",
  },
  {
    icon: Ban,
    label: "拉黑禁发",
    text: "拉黑、封禁、注销和软删除用户都会禁用继续发送。",
  },
];

const conversationRows = [
  {
    label: "朋友会话",
    meta: "置顶、免打扰、归档、本地删除",
    title: "互关用户的普通私信",
  },
  {
    label: "陌生人请求",
    meta: "接受、忽略、删除、举报、拉黑",
    title: "请求未接受前只能发送首条文字或分享卡片",
  },
  {
    label: "分享卡片",
    meta: "帖子、评论、用户、社区",
    title: "内容不可见时降级为“内容暂不可查看”",
  },
];

export function MessageUnavailablePage({
  conversationId,
}: {
  conversationId?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 lg:px-0">
      <header className="border-b border-border pb-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold tracking-normal text-primary">
              私信系统
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-8 tracking-normal text-foreground sm:text-3xl sm:leading-10">
              私信
            </h1>
          </div>
          <span className="inline-flex h-8 items-center border border-primary/40 bg-primary/10 px-2 font-mono text-[11px] font-semibold text-primary">
            后端待接入
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          当前只开放前端边界和产品规格预览。私信会话、请求箱、实时到达、举报、拉黑和隐私设置必须等后端合同落地后才能启用。
        </p>
        {conversationId ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            请求的会话 ID：{conversationId}
          </p>
        ) : null}
      </header>

      <div className="grid min-w-0 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <section className="border-b border-border pb-5">
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
              {boxTabs.map((tab, index) => (
                <span
                  key={tab}
                  aria-disabled="true"
                  className={cn(
                    "inline-flex h-8 items-center border-b px-2 text-sm font-semibold",
                    index === 0
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground",
                  )}
                >
                  {tab}
                </span>
              ))}
            </div>

            <div className="divide-y divide-border">
              {conversationRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 py-4"
                >
                  <span className="flex size-9 items-center justify-center border border-border bg-background-soft text-primary">
                    <MessageCircle className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {row.title}
                      </h2>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {row.label}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {row.meta}
                    </p>
                  </div>
                  <span className="hidden self-start font-mono text-[11px] text-muted-foreground sm:inline">
                    待接入
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-border py-5">
            <div className="flex items-center gap-2">
              <Send className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">
                分享卡片设计
              </h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              帖子、评论、用户和社区分享都会保存类型、目标 ID、标题、摘要、缩略图和目标 URL 快照；原内容删除或不可见时，卡片必须降级展示。
            </p>
            <div className="mt-4 max-w-xl border border-border bg-background-soft p-3">
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
                <div className="flex aspect-[4/3] items-center justify-center border border-border bg-background text-muted-foreground">
                  <ImageIcon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-primary">帖子分享</p>
                  <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">
                    内容标题快照
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    摘要快照用于会话内预览；目标不可见时展示“内容暂不可查看”。
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside className="min-w-0">
          <section className="border-y border-border py-4">
            <h2 className="text-sm font-semibold text-foreground">私信边界</h2>
            <div className="mt-3 divide-y divide-border">
              {capabilityRows.map((row) => (
                <div key={row.label} className="flex min-w-0 gap-3 py-3">
                  <row.icon
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {row.label}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {row.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-border py-4">
            <h2 className="text-sm font-semibold text-foreground">当前状态</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              不提供语音、视频或通话。WebSocket 只推送事件，HTTP 列表和详情仍是权威数据源。
            </p>
            <div className="mt-4 flex flex-col border-t border-border">
              <TextAction href="/settings/privacy" variant="bar">
                隐私与私信设置
              </TextAction>
              <TextAction href="/notifications" variant="bar">
                查看互动消息
              </TextAction>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
