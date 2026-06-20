"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  ClipboardCheck,
  Hash,
  Inbox,
  KeyRound,
  Settings2,
  ShieldAlert,
  Users,
} from "lucide-react";

import {
  ReviewDesk,
  ReviewDeskBoard,
  ReviewDeskMasthead,
  ReviewDeskPanel,
  ReviewDeskState,
} from "@/components/app-shell/review-desk";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  IndexedInfoRow,
  MetricBlock,
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { useCommunityApplicationsQuery } from "@/features/community/queries";
import { useAdminModQueueSummaryQuery } from "@/features/moderation/queries";
import { ApiError } from "@/lib/api/client";

import { AdminToolsNav } from "./admin-tools-nav";
import { formatDateTime } from "./display";
import { useAdminSettingsQuery } from "./queries";
import type { PlatformRole } from "./types";
import { useEffectiveAdminPlatformRole } from "./use-effective-platform-role";

export function AdminDashboard() {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const effectivePlatformRole = useEffectiveAdminPlatformRole(currentUserQuery.data);
  const platformRole = effectivePlatformRole.role;
  const canViewPlatformAdmin = isReady && Boolean(token) && Boolean(platformRole);
  const canViewOperationalAdmin =
    canViewPlatformAdmin && (platformRole === "owner" || platformRole === "admin");
  const settingsQuery = useAdminSettingsQuery(canViewOperationalAdmin);
  const queueSummaryQuery = useAdminModQueueSummaryQuery(canViewPlatformAdmin);
  const applicationsQuery = useCommunityApplicationsQuery(
    {
      limit: 5,
      offset: 0,
      status: "pending",
    },
    canViewPlatformAdmin,
  );
  const isLoading =
    !isReady ||
    effectivePlatformRole.isResolving ||
    (token && currentUserQuery.isLoading) ||
    (canViewOperationalAdmin && settingsQuery.isPending) ||
    (canViewPlatformAdmin && queueSummaryQuery.isPending) ||
    (canViewPlatformAdmin && applicationsQuery.isPending);
  const error =
    currentUserQuery.error ??
    (canViewOperationalAdmin ? settingsQuery.error : null) ??
    (canViewPlatformAdmin ? queueSummaryQuery.error : null) ??
    (canViewPlatformAdmin ? applicationsQuery.error : null);
  const loginHref = `/login?next=${encodeURIComponent("/admin")}`;

  if (isLoading) {
    return (
      <AdminDashboardLayout
        applicationsCount={0}
        platformRole={null}
        body={
          <ReviewDeskState>
            <LoadingState rows={6} />
          </ReviewDeskState>
        }
        reportsCount={0}
        roleLabel="确认中"
        settingsCount={0}
      />
    );
  }

  if (!token) {
    return (
      <AdminDashboardLayout
        applicationsCount={0}
        platformRole={null}
        body={
          <ReviewDeskState>
            <EmptyState
              title="登录后进入平台管理"
              description="平台管理需要 owner、admin 或 staff 权限。登录后会自动确认角色。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          </ReviewDeskState>
        }
        reportsCount={0}
        roleLabel="未登录"
        settingsCount={0}
      />
    );
  }

  if (error) {
    return (
      <AdminDashboardLayout
        applicationsCount={0}
        platformRole={null}
        body={
          <ReviewDeskState>
            <ErrorState
              title="无法加载平台总览"
              description={getErrorDescription(error)}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void currentUserQuery.refetch();
                    if (canViewOperationalAdmin) {
                      void settingsQuery.refetch();
                    }
                    if (canViewPlatformAdmin) {
                      void queueSummaryQuery.refetch();
                      void applicationsQuery.refetch();
                    }
                  }}
                >
                  重试
                </Button>
              }
            />
          </ReviewDeskState>
        }
        reportsCount={0}
        roleLabel="加载失败"
        settingsCount={0}
      />
    );
  }

  if (!platformRole) {
    return (
      <AdminDashboardLayout
        applicationsCount={0}
        platformRole={null}
        body={
          <ReviewDeskState>
            <EmptyState
              title="需要平台权限"
              description="当前账号没有平台管理权限，不能查看管理总控。"
              action={<TextAction href="/">信息流首页</TextAction>}
            />
          </ReviewDeskState>
        }
        reportsCount={0}
        roleLabel="无权限"
        settingsCount={0}
      />
    );
  }

  const settings = canViewOperationalAdmin ? settingsQuery.data?.settings ?? [] : [];
  const queueSummary = queueSummaryQuery.data;
  const priorityItems = queueSummary?.priority_items ?? [];
  const reportsCount = getQueueCount(queueSummary?.queues ?? [], "reports");
  const applications = applicationsQuery.data?.applications ?? [];

  return (
    <AdminDashboardLayout
      applicationsCount={applications.length}
      platformRole={platformRole}
      reportsCount={reportsCount}
      roleLabel={formatPlatformRole(platformRole)}
      settingsCount={settings.length}
      body={
        <AdminDashboardWorkspace
          applications={applications.map((application) => ({
            href: "/admin/community-applications",
            meta: `/${application.requested_slug}`,
            title: application.requested_name,
          }))}
          applicationsCount={applications.length}
          canViewOperationalAdmin={canViewOperationalAdmin}
          reports={priorityItems.map((item) => ({
            href: `/admin/reports/${encodeURIComponent(item.id)}`,
            meta: `/${item.community_slug} · ${formatDateTime(item.created_at)} · ${item.report_count} 条举报`,
            title: item.preview || item.target_id,
          }))}
          reportsCount={reportsCount}
          settingsCount={settings.length}
        />
      }
    />
  );
}

function AdminDashboardLayout({
  applicationsCount,
  body,
  platformRole,
  reportsCount,
  roleLabel,
  settingsCount,
}: {
  applicationsCount: number;
  body: ReactNode;
  platformRole: PlatformRole | null;
  reportsCount: number;
  roleLabel: string;
  settingsCount: number;
}) {
  return (
    <ReviewDesk className="max-w-[1320px]">
      <ReviewDeskMasthead
        eyebrow="/admin"
        title="平台管理总控"
        description="平台管理按社区管理的工作台结构收口：总控页只显示当前状态、优先队列和工具入口，具体处理进入独立细分页。"
        meta={
          <>
            <MetricBlock label="当前工具" value="管理概览" variant="compact" />
            <MetricBlock label="平台身份" value={roleLabel} variant="compact" />
            <MetricBlock label="待处理举报" value={reportsCount} variant="compact" />
            <MetricBlock
              label="社区申请"
              value={applicationsCount}
              variant="compact"
            />
          </>
        }
      />
      <ReviewDeskBoard
        inspector={
          <AdminToolsNav activePath="/admin" platformRole={platformRole} />
        }
      >
        <ReviewDeskPanel
          title="管理概览"
          description="平台总控是入口和优先级工作区；用户、社区、审计、成长等任务进入右侧工具导航对应页面。"
        >
          {body}
          <AdminDashboardInspector settingsCount={settingsCount} />
        </ReviewDeskPanel>
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

function AdminDashboardWorkspace({
  applications,
  applicationsCount,
  canViewOperationalAdmin,
  reports,
  reportsCount,
  settingsCount,
}: {
  applications: Array<{ href: string; meta: string; title: string }>;
  applicationsCount: number;
  canViewOperationalAdmin: boolean;
  reports: Array<{ href: string; meta: string; title: string }>;
  reportsCount: number;
  settingsCount: number;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DashboardEntry
          description="处理举报、垃圾、已移除、已编辑、未审核和需要关注内容。"
          href="/admin/reports"
          icon={<ShieldAlert className="size-4" aria-hidden="true" />}
          label="全站队列"
          tone={reportsCount > 0 ? "warning" : "success"}
          value={`${reportsCount} 条待处理预览`}
        />
        <DashboardEntry
          description="审核新社区申请，通过后创建社区并设置社区 owner。"
          href="/admin/community-applications"
          icon={<ClipboardCheck className="size-4" aria-hidden="true" />}
          label="社区审批"
          tone={applicationsCount > 0 ? "warning" : "success"}
          value={`${applicationsCount} 条待审核预览`}
        />
        {canViewOperationalAdmin ? (
          <DashboardEntry
            description="禁用用户、恢复账号；站点负责人可调整管理员和审核员。"
            href="/admin/users"
            icon={<Users className="size-4" aria-hidden="true" />}
            label="用户管理"
            value="搜索后处理"
          />
        ) : null}
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <PreviewSection
          actionHref="/admin/reports"
          actionLabel="查看队列"
          description="来自全站举报队列第一页，不代表总数。"
          emptyText="没有待处理举报。"
          items={reports}
          title="待处理举报"
        />
        <PreviewSection
          actionHref="/admin/community-applications"
          actionLabel="查看申请"
          description="社区申请通过后才会创建社区。"
          emptyText="没有待审核社区申请。"
          items={applications}
          title="待审核社区申请"
        />
      </div>

      {canViewOperationalAdmin ? (
        <section className="grid gap-3 md:grid-cols-3">
          <DashboardEntry
            description="暂停、恢复、归档社区，异常场景下接管社区 owner。"
            href="/admin/communities"
            icon={<Hash className="size-4" aria-hidden="true" />}
            label="社区治理"
            value="平台侧边界"
          />
          <DashboardEntry
            description="查看开关状态，关闭高风险能力前二次确认。"
            href="/admin/settings"
            icon={<Settings2 className="size-4" aria-hidden="true" />}
            label="运行开关"
            value={`${settingsCount} 个开关`}
          />
          <DashboardEntry
            description="站点负责人交接使用独立双确认合同。"
            href="/admin/owner-transfer"
            icon={<KeyRound className="size-4" aria-hidden="true" />}
            label="负责人交接"
            value="独立流程"
          />
        </section>
      ) : null}
    </div>
  );
}

function AdminDashboardInspector({ settingsCount }: { settingsCount: number }) {
  return (
    <section className="mt-4 rounded-md bg-surface-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusToken tone="primary">总控规则</StatusToken>
        <StatusToken>{settingsCount} 个运行开关</StatusToken>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <IndexedInfoRow
          index="01"
          title="队列优先"
          text="举报和社区申请是日常入口，放在总控第一屏。"
        />
        <IndexedInfoRow
          index="02"
          title="能力分层"
          text="owner/admin 才显示运行开关、用户治理和负责人交接。"
        />
        <IndexedInfoRow
          index="03"
          title="不伪造能力"
          text="后端没有合同的 Modmail、Automod 和数据摘要只展示规划状态。"
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DashboardGapItem
          description="Modmail 需要会话、文件夹、回复、内部 note、归档和分配接口。"
          icon={<Inbox className="size-4" aria-hidden="true" />}
          title="Modmail"
        />
        <DashboardGapItem
          description="Automod、安全过滤和内容控制需要规则配置、版本历史、测试和审计。"
          icon={<Bot className="size-4" aria-hidden="true" />}
          title="自动化与安全"
        />
      </div>
    </section>
  );
}

function DashboardEntry({
  description,
  href,
  icon,
  label,
  tone = "default",
  value,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  label: string;
  tone?: StatusTokenTone;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="nexus-micro-lift group min-w-0 rounded-md bg-surface-raised p-4 text-sm transition-colors hover:bg-surface-hover"
    >
      <span className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <span className="font-semibold text-foreground group-hover:text-primary">
          {label}
        </span>
      </span>
      <span className="mt-3 inline-flex">
        <StatusToken tone={tone}>{value}</StatusToken>
      </span>
      <span className="mt-3 block text-sm leading-6 text-muted-foreground">
        {description}
      </span>
    </Link>
  );
}

function PreviewSection({
  actionHref,
  actionLabel,
  description,
  emptyText,
  items,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  emptyText: string;
  items: Array<{ href: string; meta: string; title: string }>;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-md bg-surface-raised p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <TextAction href={actionHref}>{actionLabel}</TextAction>
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">{emptyText}</p>
        ) : (
          <PreviewList items={items} />
        )}
      </div>
    </section>
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
    <div className="min-w-0 rounded-md bg-surface p-4">
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
  items,
}: {
  items: Array<{ href: string; meta: string; title: string }>;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <Link
          key={`${item.href}-${index}`}
          href={item.href}
          className="nexus-micro-lift grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-md bg-surface px-3 py-3 text-sm transition-colors hover:bg-surface-hover hover:text-primary"
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

function formatPlatformRole(role: string | null) {
  switch (role) {
    case "owner":
      return "站点负责人";
    case "admin":
      return "平台管理员";
    case "staff":
      return "平台审核员";
    default:
      return "平台权限";
  }
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function getQueueCount(
  queues: Array<{ count: number; queue: string }>,
  queue: string,
) {
  return queues.find((item) => item.queue === queue)?.count ?? 0;
}
