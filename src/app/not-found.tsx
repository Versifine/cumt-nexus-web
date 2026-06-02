import { StatusPage } from "@/components/feedback/status-page";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      eyebrow="404 / 未找到"
      title="这个页面不存在或已经移动"
      description="当前地址没有对应的校园社区页面。可能是链接写错、内容已被移除，或这个入口还没有开放。"
      rows={[
        ["当前状态", "未找到"],
        ["建议入口", "首页 / 社区索引"],
        ["处理方式", "返回可用页面"],
      ]}
    />
  );
}
