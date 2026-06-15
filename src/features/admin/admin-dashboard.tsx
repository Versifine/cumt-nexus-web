"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  ClipboardCheck,
  Inbox,
  KeyRound,
  ListChecks,
  Settings2,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { hasLegacyPlatformStaffOnly } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { useCommunityApplicationsQuery } from "@/features/community/queries";
import { useModerationReportsQuery } from "@/features/moderation/queries";
import { ApiError } from "@/lib/api/client";

import {
  formatDateTime,
  resolvePlatformRole,
} from "./display";
import { useAdminSettingsQuery } from "./queries";

export function AdminDashboard() {
  const currentUserQuery = useCurrentUserQuery();
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const canViewOperationalAdmin =
    platformRole !== "staff" || hasLegacyPlatformStaffOnly(currentUserQuery.data);
  const settingsQuery = useAdminSettingsQuery(canViewOperationalAdmin);
  const reportsQuery = useModerationReportsQuery({
    limit: 5,
    offset: 0,
    status: "pending",
  });
  const applicationsQuery = useCommunityApplicationsQuery({
    limit: 5,
    offset: 0,
    status: "pending",
  });
  const isLoading =
    (canViewOperationalAdmin && settingsQuery.isPending) ||
    reportsQuery.isPending ||
    applicationsQuery.isPending;
  const error =
    (canViewOperationalAdmin ? settingsQuery.error : null) ??
    reportsQuery.error ??
    applicationsQuery.error;

  if (isLoading) {
    return (
      <div className="border-b border-border py-4">
        <LoadingState rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-b border-border py-4">
        <ErrorState
          title="无法加载平台总览"
          description={getErrorDescription(error)}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (canViewOperationalAdmin) {
                  void settingsQuery.refetch();
                }
                void reportsQuery.refetch();
                void applicationsQuery.refetch();
              }}
            >
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const settings = canViewOperationalAdmin ? settingsQuery.data?.settings ?? [] : [];
  const reports = reportsQuery.data?.reports ?? [];
  const applications = applicationsQuery.data?.applications ?? [];

  return (
    <section className="min-w-0">
        <div className="grid grid-cols-1 border-b border-border md:grid-cols-2">
          <DashboardEntry
            description="处理举报、垃圾、已移除、已编辑、未审核和需要关注内容。"
            href="/admin/reports"
            icon={<ShieldAlert className="size-4" aria-hidden="true" />}
            label="全站队列"
            value={`${reports.length} 条待处理预览`}
          />
          <DashboardEntry
            description="审核新社区申请，通过后创建社区版主。"
            href="/admin/community-applications"
            icon={<ClipboardCheck className="size-4" aria-hidden="true" />}
            label="社区审批"
            value={`${applications.length} 条待审核预览`}
          />
          {canViewOperationalAdmin ? (
            <>
              <DashboardEntry
                description="禁用用户、恢复账号；站点负责人可调整管理员和审核员。"
                href="/admin/users"
                icon={<Users className="size-4" aria-hidden="true" />}
                label="用户管理"
                value="owner 变更走单独流程"
              />
              <DashboardEntry
                description="站点负责人交接使用独立双确认合同；部署侧 recovery 不开放网页接管。"
                href="/admin/owner-transfer"
                icon={<KeyRound className="size-4" aria-hidden="true" />}
                label="负责人交接"
                value="独立流程"
              />
              <DashboardEntry
                description="查看开关状态，关闭高风险能力前二次确认。"
                href="/admin/settings"
                icon={<Settings2 className="size-4" aria-hidden="true" />}
                label="运行开关"
                value={`${settings.length} 个开关`}
              />
            </>
          ) : null}
        </div>

        <section className="border-b border-border py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">待处理举报</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                来自真实举报队列第一页，不代表总数。
              </p>
            </div>
            <TextAction href="/admin/reports" tone="primary">
              查看全部
            </TextAction>
          </div>
          <PreviewList
            emptyTitle="没有待处理举报"
            items={reports.map((report) => ({
              href: `/admin/reports/${report.id}`,
              meta: formatDateTime(report.created_at),
              title: report.reason,
            }))}
          />
        </section>

        <section className="border-b border-border py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">待审核社区申请</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                申请通过后才会创建社区。
              </p>
            </div>
            <TextAction href="/admin/community-applications" tone="primary">
              查看全部
            </TextAction>
          </div>
          <PreviewList
            emptyTitle="没有待审核申请"
            items={applications.map((application) => ({
              href: "/admin/community-applications",
              meta: `/${application.requested_slug}`,
              title: application.requested_name,
            }))}
          />
        </section>

        <section className="border-b border-border py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Reddit 式平台工具规划</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                已就绪能力直接进入工作台，后端仍缺的工具只显示真实状态说明。
              </p>
            </div>
            <StatusToken tone="primary">P1 已接入</StatusToken>
          </div>
          <div className="mt-4 grid grid-cols-1 border-t border-border md:grid-cols-2">
            <DashboardGapItem
              description="全站和社区 Mod Queue 已接入举报、垃圾、已移除、已编辑、未审核和需要关注队列。"
              icon={<ListChecks className="size-4" aria-hidden="true" />}
              title="队列工作台"
            />
            <DashboardGapItem
              description="全站与社区 Modmail 需要会话、文件夹、回复、内部 note、归档和分配接口。"
              icon={<Inbox className="size-4" aria-hidden="true" />}
              title="Modmail"
            />
            <DashboardGapItem
              description="Automod、安全过滤和内容控制需要规则配置、版本历史、测试和审计。"
              icon={<Bot className="size-4" aria-hidden="true" />}
              title="自动化与安全"
            />
            <DashboardGapItem
              description="flair 模板、定时帖、社区摘要和更细的训练队列仍需要后端合同。"
              icon={<Sparkles className="size-4" aria-hidden="true" />}
              title="后续社区管理工具"
            />
          </div>
        </section>
    </section>
  );
}

function DashboardEntry({
  description,
  href,
  icon,
  label,
  value,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="group border-b border-border px-3 py-4 transition-colors hover:bg-background-soft/50 md:border-r md:[&:nth-child(2n)]:border-r-0"
    >
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-semibold group-hover:text-primary">{label}</h2>
      </div>
      <div className="mt-3">
        <StatusToken>{value}</StatusToken>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

function DashboardGapItem({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="min-w-0 border-b border-border px-3 py-4 md:border-r md:[&:nth-child(2n)]:border-r-0">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function PreviewList({
  emptyTitle,
  items,
}: {
  emptyTitle: string;
  items: Array<{ href: string; meta: string; title: string }>;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState title={emptyTitle} description="稍后刷新或切换到完整列表查看。" />
      </div>
    );
  }

  return (
    <div className="mt-4 divide-y divide-border border-t border-border">
      {items.map((item, index) => (
        <Link
          key={`${item.href}-${index}`}
          href={item.href}
          className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 py-3 text-sm transition-colors hover:text-primary"
        >
          <span className="font-mono text-xs text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground">
              {item.title}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {item.meta}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
