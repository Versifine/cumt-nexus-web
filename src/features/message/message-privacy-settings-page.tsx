import { EyeOff, MessageCircle, ShieldAlert, UserCheck } from "lucide-react";

import { TextAction } from "@/components/ui/text-action";

const settingRows = [
  {
    checked: true,
    icon: UserCheck,
    label: "互关用户可直接发私信",
    text: "后端接入后，互关用户进入普通会话；非互关进入陌生人请求。",
  },
  {
    checked: true,
    icon: ShieldAlert,
    label: "陌生人请求箱",
    text: "请求未接受前只能发送首条文字或分享卡片，不能连续追发。",
  },
  {
    checked: false,
    icon: EyeOff,
    label: "展示在线状态",
    text: "默认关闭；开启后仅互关可见。关闭后也不能查看对方在线状态。",
  },
];

export function MessagePrivacySettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 lg:px-0">
      <header className="border-b border-border pb-5">
        <p className="font-mono text-xs font-semibold tracking-normal text-primary">
          隐私设置
        </p>
        <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold leading-8 tracking-normal text-foreground sm:text-3xl sm:leading-10">
            隐私与私信
          </h1>
          <span className="inline-flex h-8 items-center border border-primary/40 bg-primary/10 px-2 font-mono text-[11px] font-semibold text-primary">
            私信权限待接入
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          当前页面只展示未来私信设置的合同边界。后端未提供私信隐私接口前，不能保存或读取真实设置。
        </p>
      </header>

      <main className="grid min-w-0 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 border-y border-border">
          {settingRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[24px_minmax(0,1fr)_48px] gap-3 border-b border-border py-4 last:border-b-0"
            >
              <row.icon
                className="mt-1 size-4 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {row.label}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {row.text}
                </p>
              </div>
              <span
                aria-disabled="true"
                aria-label={row.checked ? "默认开启，暂不可修改" : "默认关闭，暂不可修改"}
                className="mt-1 inline-flex h-6 w-11 items-center border border-border bg-background-soft px-0.5"
              >
                <span
                  className={
                    row.checked
                      ? "ml-auto size-4 bg-primary"
                      : "size-4 bg-muted-foreground/40"
                  }
                />
              </span>
            </div>
          ))}
        </section>

        <aside className="min-w-0">
          <section className="border-y border-border py-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">
                前端处理
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              私信入口、用户主页动作和分享动作都会保持禁用态，直到后端合同、schema、错误码和 verifier 全部落地。
            </p>
            <div className="mt-4 flex flex-col border-t border-border">
              <TextAction href="/messages" variant="bar">
                查看私信边界
              </TextAction>
              <TextAction href="/settings/profile" variant="bar">
                返回资料设置
              </TextAction>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
