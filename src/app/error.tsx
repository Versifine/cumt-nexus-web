"use client";

import { RetryAction, StatusPage } from "@/components/feedback/status-page";

type ErrorPageProps = {
  error: unknown;
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <StatusPage
      code="ERROR"
      eyebrow="错误 / 页面中断"
      title="页面暂时无法继续显示"
      description="当前页面运行过程中出现了异常。你可以先重试本页；如果仍然失败，返回首页继续浏览其他社区内容。"
      rows={[
        ["当前状态", "页面异常"],
        ["恢复方式", "重试本页"],
        ["稳定出口", "首页 / 社区索引"],
      ]}
      actions={<RetryAction onRetry={reset} />}
    />
  );
}
