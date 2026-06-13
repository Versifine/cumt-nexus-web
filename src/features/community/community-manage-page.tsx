"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IndexedInfoRow } from "@/components/ui/data-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import {
  useCreateCommunityRuleMutation,
  useDeleteCommunityRuleMutation,
  useUpdateCommunityManageSettingsMutation,
  useUpdateCommunityRuleMutation,
  useCommunityManageSettingsQuery,
  useCommunityManageCommentsQuery,
  useCommunityManageContextQuery,
  useCommunityManagePostsQuery,
  useCommunityManageReportsQuery,
  useCommunityMembersQuery,
  useCommunityQuery,
  useCommunityRulesQuery,
} from "./queries";
import type {
  Community,
  CommunityMember,
  CommunityManageSettings,
  CommunityManageComment,
  CommunityManagePost,
  CommunityManageReport,
  CommunityRule,
} from "./types";

const settingsSchema = z.object({
  name: z.string().trim().min(1, "请输入社区名称。"),
  description: z.string().trim(),
});

const ruleSchema = z.object({
  title: z.string().trim().min(1, "请输入规则标题。"),
  body: z.string().trim(),
  position: z
    .number({ error: "请输入规则顺序。" })
    .int("规则顺序必须是整数。")
    .min(0, "规则顺序不能小于 0。"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;
type RuleFormValues = z.infer<typeof ruleSchema>;

type CommunityManagePageProps = {
  slug: string;
};

export function CommunityManagePage({ slug }: CommunityManagePageProps) {
  const { isReady, token } = useAuthSession();
  const isAuthenticated = Boolean(token);
  const loginHref = `/login?next=${encodeURIComponent(
    `/communities/${slug}/manage`,
  )}`;
  const communityQuery = useCommunityQuery(slug, isReady);
  const viewerCommunity = communityQuery.data?.community;
  const canManageCommunity =
    viewerCommunity?.viewer_permissions?.can_manage === true ||
    viewerCommunity?.viewer_permissions?.can_moderate === true;
  const shouldShowForbidden =
    isReady &&
    isAuthenticated &&
    communityQuery.isSuccess &&
    Boolean(viewerCommunity) &&
    !canManageCommunity;
  const canLoadManage =
    isReady && isAuthenticated && communityQuery.isSuccess && canManageCommunity;
  const manageQuery = useCommunityManageContextQuery(slug, canLoadManage);
  const canLoadLists = canLoadManage && manageQuery.isSuccess;
  const postsQuery = useCommunityManagePostsQuery(
    { limit: 5, offset: 0, slug, status: "all" },
    canLoadLists,
  );
  const commentsQuery = useCommunityManageCommentsQuery(
    { limit: 5, offset: 0, slug, status: "all" },
    canLoadLists,
  );
  const reportsQuery = useCommunityManageReportsQuery(
    { limit: 5, offset: 0, slug, status: "pending" },
    canLoadLists,
  );
  const membersQuery = useCommunityMembersQuery(
    { limit: 5, offset: 0, slug },
    canLoadLists,
  );
  const settingsQuery = useCommunityManageSettingsQuery(slug, canLoadLists);
  const rulesQuery = useCommunityRulesQuery(slug, canLoadLists);
  const community = manageQuery.data?.community ?? viewerCommunity;
  const managedPosts = postsQuery.data?.posts ?? [];
  const managedComments = commentsQuery.data?.comments ?? [];
  const managedReports = reportsQuery.data?.reports ?? [];
  const managedMembers = membersQuery.data?.members ?? [];
  const managedSettings = settingsQuery.data?.settings;
  const managedRules = rulesQuery.data?.rules ?? [];
  const canEditSettings = community?.viewer_permissions?.can_manage === true;
  const canEditRules = community?.viewer_permissions?.can_moderate === true;

  return (
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <section className="bg-background">
          <ManageHeader
            canManageCommunity={canManageCommunity}
            community={community}
            slug={slug}
          />
        </section>

        <section className="bg-background">
          <div className="border-b border-border py-3">
            <h2 className="text-sm font-semibold">管理概览</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              集中查看本社区的内容状态和成员，并维护资料与规则；未接入的成员写操作不会在这里伪造。
            </p>
          </div>

          {!isReady ? (
            <StatePanel>
              <LoadingState rows={4} />
            </StatePanel>
          ) : null}

          {isReady && !isAuthenticated ? (
            <StatePanel>
              <EmptyState
                title="登录后管理社区"
                description="社区管理需要 owner 或 moderator 权限。登录后会回到当前社区管理页。"
                action={
                  <TextAction href={loginHref} tone="primary">
                    登录
                  </TextAction>
                }
              />
            </StatePanel>
          ) : null}

          {isReady && isAuthenticated && communityQuery.isPending ? (
            <StatePanel>
              <LoadingState rows={4} />
            </StatePanel>
          ) : null}

          {isReady && isAuthenticated && communityQuery.isError ? (
            <StatePanel>
              <ErrorState
                title="无法加载社区"
                description="读取社区权限上下文失败，请稍后重试。"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-1 hover:bg-transparent hover:text-primary"
                    onClick={() => communityQuery.refetch()}
                  >
                    重试
                  </Button>
                }
              />
            </StatePanel>
          ) : null}

          {shouldShowForbidden ? (
            <StatePanel>
              <EmptyState
                title="需要社区权限"
                description="当前账号不是这个社区的 owner 或 moderator，不能查看社区管理。"
                action={
                  <TextAction
                    href={`/communities/${encodeURIComponent(slug)}`}
                    tone="primary"
                  >
                    查看社区
                  </TextAction>
                }
              />
            </StatePanel>
          ) : null}

          {canLoadManage && manageQuery.isPending ? (
            <StatePanel>
              <LoadingState rows={4} />
            </StatePanel>
          ) : null}

          {canLoadManage && manageQuery.isError ? (
            <StatePanel>
              <ErrorState
                title={getManageErrorTitle(manageQuery.error)}
                description={getErrorDescription(manageQuery.error)}
                action={
                  isUnauthenticated(manageQuery.error) ? (
                    <TextAction href={loginHref} tone="primary">
                      登录
                    </TextAction>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-1 hover:bg-transparent hover:text-primary"
                      onClick={() => manageQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </StatePanel>
          ) : null}

          {community && manageQuery.isSuccess ? (
            <>
              <div className="grid grid-cols-1 border-b border-border lg:grid-cols-3">
                <ManagePreviewSection
                  description="最新管理视角帖子"
                  emptyText="暂无可管理帖子。"
                  isError={postsQuery.isError}
                  isEmpty={managedPosts.length === 0}
                  isLoading={postsQuery.isPending}
                  onRetry={() => postsQuery.refetch()}
                  title="帖子"
                >
                  <ManagePostList posts={managedPosts} />
                </ManagePreviewSection>

                <ManagePreviewSection
                  description="最新评论片段"
                  emptyText="暂无可管理评论。"
                  isError={commentsQuery.isError}
                  isEmpty={managedComments.length === 0}
                  isLoading={commentsQuery.isPending}
                  onRetry={() => commentsQuery.refetch()}
                  title="评论"
                >
                  <ManageCommentList comments={managedComments} />
                </ManagePreviewSection>

                <ManagePreviewSection
                  description="待处理社区举报"
                  emptyText="暂无待处理举报。"
                  isError={reportsQuery.isError}
                  isEmpty={managedReports.length === 0}
                  isLoading={reportsQuery.isPending}
                  onRetry={() => reportsQuery.refetch()}
                  title="举报"
                >
                  <ManageReportList reports={managedReports} />
                </ManagePreviewSection>
              </div>

              <div className="grid grid-cols-1 border-b border-border lg:grid-cols-3">
                <ManagePreviewSection
                  description="当前管理可见成员"
                  emptyText="暂无成员记录。"
                  isError={membersQuery.isError}
                  isEmpty={managedMembers.length === 0}
                  isLoading={membersQuery.isPending}
                  onRetry={() => membersQuery.refetch()}
                  title="成员"
                >
                  <ManageMemberList members={managedMembers} />
                </ManagePreviewSection>

                <ManagePreviewSection
                  description="负责人可维护社区名称和简介"
                  emptyText="暂无社区资料。"
                  isError={settingsQuery.isError}
                  isEmpty={!managedSettings}
                  isLoading={settingsQuery.isPending}
                  onRetry={() => settingsQuery.refetch()}
                  title="资料"
                >
                  {managedSettings ? (
                    <ManageSettingsEditor
                      canEdit={canEditSettings}
                      settings={managedSettings}
                      slug={slug}
                    />
                  ) : null}
                </ManagePreviewSection>

                <ManagePreviewSection
                  description="负责人和版主可维护规则"
                  emptyText="暂无社区规则。"
                  isError={rulesQuery.isError}
                  isEmpty={false}
                  isLoading={rulesQuery.isPending}
                  onRetry={() => rulesQuery.refetch()}
                  title="规则"
                >
                  <ManageRuleManager
                    canEdit={canEditRules}
                    rules={managedRules}
                    slug={slug}
                  />
                </ManagePreviewSection>
              </div>
            </>
          ) : null}
        </section>
      </div>

      <ManageRail
        community={community}
        hasMembers={managedMembers.length > 0}
        hasRules={managedRules.length > 0}
        hasSettings={Boolean(managedSettings)}
        slug={slug}
      />
    </div>
  );
}

function ManageHeader({
  canManageCommunity,
  community,
  slug,
}: {
  canManageCommunity: boolean;
  community?: Community;
  slug: string;
}) {
  return (
    <div className="border-b border-border py-4">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
          社区管理
        </h1>
        <p className="mt-1 truncate font-mono text-xs text-primary">
          /{slug}/manage
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {community && canManageCommunity
            ? `${community.name} 的社区管理入口。当前角色 ${formatViewerRole(community.viewer_role)}，成员 ${formatCount(community.member_count)}，帖子 ${formatCount(community.post_count)}。所有写操作仍由后端权限校验。`
            : null}
          {community && !canManageCommunity
            ? `当前账号没有 ${community.name} 的管理权限。`
            : null}
          {!community ? "读取社区管理上下文后会显示权限和待处理内容。" : null}
        </p>
      </div>

    </div>
  );
}

function ManagePreviewSection({
  children,
  description,
  emptyText,
  isError,
  isEmpty,
  isLoading,
  onRetry,
  title,
}: {
  children: ReactNode;
  description: string;
  emptyText: string;
  isError: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  onRetry: () => void;
  title: string;
}) {
  return (
    <section className="min-w-0 border-b border-border px-0 py-4 last:border-b-0 lg:border-b-0 lg:border-r lg:px-4 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mt-4">
        {isLoading ? <LoadingState rows={3} /> : null}
        {isError ? (
          <ErrorState
            title={`无法加载${title}`}
            description="请求失败，请稍后重试。"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="px-1 hover:bg-transparent hover:text-primary"
                onClick={onRetry}
              >
                重试
              </Button>
            }
          />
        ) : null}
        {isEmpty ? (
          <p className="text-sm leading-6 text-muted-foreground">{emptyText}</p>
        ) : null}
        {!isLoading && !isError && !isEmpty ? children : null}
      </div>
    </section>
  );
}

function ManagePostList({ posts }: { posts: CommunityManagePost[] }) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div>
      {posts.map((post, index) => (
        <IndexedInfoRow
          key={post.id}
          index={String(index + 1).padStart(2, "0")}
          title={post.title}
          text={`${formatContentStatus(post.status)} / ${formatDate(post.updated_at)}`}
        />
      ))}
    </div>
  );
}

function ManageCommentList({ comments }: { comments: CommunityManageComment[] }) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div>
      {comments.map((comment, index) => (
        <IndexedInfoRow
          key={comment.id}
          index={String(index + 1).padStart(2, "0")}
          title={comment.body_excerpt || "无正文摘要"}
          text={`${formatContentStatus(comment.status)} / ${formatDate(comment.updated_at)}`}
        />
      ))}
    </div>
  );
}

function ManageReportList({ reports }: { reports: CommunityManageReport[] }) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <div>
      {reports.map((report, index) => (
        <IndexedInfoRow
          key={report.id}
          index={String(index + 1).padStart(2, "0")}
          title={report.target_preview?.title || report.reason}
          text={`${formatReportTarget(report.target_type)} / ${formatReportStatus(report.status)}`}
        />
      ))}
    </div>
  );
}

function ManageMemberList({ members }: { members: CommunityMember[] }) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div>
      {members.map((member, index) => (
        <IndexedInfoRow
          key={member.user.id}
          index={String(index + 1).padStart(2, "0")}
          title={formatMemberName(member)}
          text={`${formatViewerRole(member.role)} / ${formatMemberStatus(member.status)} / 加入于 ${formatDate(member.created_at)}`}
        />
      ))}
    </div>
  );
}

function ManageSettingsEditor({
  canEdit,
  settings,
  slug,
}: {
  canEdit: boolean;
  settings: CommunityManageSettings;
  slug: string;
}) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const updateSettingsMutation = useUpdateCommunityManageSettingsMutation();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      description: settings.description,
      name: settings.name,
    },
  });
  const nameValue = useWatch({ control: form.control, name: "name" }) ?? "";
  const descriptionValue =
    useWatch({ control: form.control, name: "description" }) ?? "";
  const submitError = updateSettingsMutation.error
    ? getErrorDescription(updateSettingsMutation.error)
    : null;
  const isSaving = updateSettingsMutation.isPending;

  useEffect(() => {
    form.reset({
      description: settings.description,
      name: settings.name,
    });
  }, [form, settings.description, settings.name]);

  async function handleSubmit(values: SettingsFormValues) {
    setSuccessMessage(null);

    try {
      const result = await updateSettingsMutation.mutateAsync({
        description: values.description,
        name: values.name,
        slug,
      });
      form.reset({
        description: result.settings.description,
        name: result.settings.name,
      });
      setSuccessMessage("社区资料已保存。");
    } catch {
      // Mutation state drives the visible error alert.
    }
  }

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <dl className="space-y-3 border-t border-border pt-3 text-sm">
          <SettingsReadOnlyRow label="名称" value={settings.name || "--"} />
          <SettingsReadOnlyRow
            label="简介"
            value={settings.description || "暂无简介"}
          />
          <SettingsReadOnlyRow
            label="头像 URL"
            value={settings.avatar_url || "未设置"}
          />
          <SettingsReadOnlyRow
            label="横幅 URL"
            value={settings.banner_url || "未设置"}
          />
          <SettingsReadOnlyRow
            label="更新"
            value={formatDate(settings.updated_at)}
          />
        </dl>
        <p className="text-xs leading-5 text-muted-foreground">
          只有社区负责人可以修改名称和简介；版主可以查看资料和维护规则。
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>资料保存失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert variant="success">
          <AlertTitle>资料已更新</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground" htmlFor="manage-community-name">
          社区名称
        </label>
        <Input
          id="manage-community-name"
          disabled={isSaving}
          aria-invalid={Boolean(form.formState.errors.name)}
          placeholder="输入社区名称"
          className="border-border bg-background"
          {...form.register("name")}
        />
        <FieldMeta
          detail={`${nameValue.trim().length} 字`}
          error={form.formState.errors.name?.message}
          hint="名称会展示在社区详情和管理页。"
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-semibold text-foreground"
          htmlFor="manage-community-description"
        >
          社区简介
        </label>
        <Textarea
          id="manage-community-description"
          disabled={isSaving}
          aria-invalid={Boolean(form.formState.errors.description)}
          placeholder="说明社区讨论范围和基本约定"
          className="min-h-28 border-border bg-background"
          {...form.register("description")}
        />
        <FieldMeta
          detail={`${descriptionValue.trim().length} 字`}
          error={form.formState.errors.description?.message}
          hint={`最近更新：${formatDate(settings.updated_at)}`}
        />
      </div>

      <Button type="submit" size="sm" disabled={isSaving}>
        {isSaving ? "正在保存..." : "保存资料"}
      </Button>
    </form>
  );
}

function SettingsReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function ManageRuleManager({
  canEdit,
  rules,
  slug,
}: {
  canEdit: boolean;
  rules: CommunityRule[];
  slug: string;
}) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deleteRule, setDeleteRule] = useState<CommunityRule | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const deleteRuleMutation = useDeleteCommunityRuleMutation();
  const deleteError = deleteRuleMutation.error
    ? getErrorDescription(deleteRuleMutation.error)
    : null;

  async function confirmDeleteRule() {
    if (!deleteRule) {
      return;
    }

    setSuccessMessage(null);
    try {
      await deleteRuleMutation.mutateAsync({
        rule_id: deleteRule.id,
        slug,
      });
      setDeleteRule(null);
      setSuccessMessage("规则已删除。");
    } catch {
      // Mutation state drives the visible error alert.
    }
  }

  return (
    <div className="space-y-4">
      {successMessage ? (
        <Alert variant="success">
          <AlertTitle>规则已更新</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {canEdit ? (
        <CreateRuleForm
          nextPosition={getNextRulePosition(rules)}
          onCreated={(rule) => {
            setEditingRuleId(null);
            setSuccessMessage(`已新增规则「${rule.title}」。`);
          }}
          slug={slug}
        />
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          当前账号可以查看社区规则，但不能维护规则。
        </p>
      )}

      {rules.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          暂无社区规则。
        </p>
      ) : (
        <div className="border-t border-border">
          {rules.map((rule) => {
            const isEditing = editingRuleId === rule.id;

            return (
              <div key={rule.id} className="py-3">
                {isEditing ? (
                  <RuleEditForm
                    onCancel={() => setEditingRuleId(null)}
                    onUpdated={(updatedRule) => {
                      setEditingRuleId(null);
                      setSuccessMessage(`已更新规则「${updatedRule.title}」。`);
                    }}
                    rule={rule}
                    slug={slug}
                  />
                ) : (
                  <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(rule.position).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-semibold">
                            {rule.title}
                          </h4>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                            {rule.body || "暂无规则说明。"}
                          </p>
                        </div>
                        {canEdit ? (
                          <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <button
                              type="button"
                              className="text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              onClick={() => setEditingRuleId(rule.id)}
                            >
                              编辑
                            </button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteRule(rule)}
                            >
                              删除
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(deleteRule)}
        onOpenChange={(open) => !open && setDeleteRule(null)}
      >
        {deleteRule ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>删除社区规则</DialogTitle>
              <DialogDescription>
                删除后该规则会从社区规则列表移除，后端会校验当前账号是否仍有管理权限。
              </DialogDescription>
            </DialogHeader>

            {deleteError ? (
              <Alert variant="destructive">
                <AlertTitle>规则删除失败</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="border-t border-border pt-3">
              <p className="text-sm font-semibold">{deleteRule.title}</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {deleteRule.body || "暂无规则说明。"}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={deleteRuleMutation.isPending}
                onClick={() => setDeleteRule(null)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteRuleMutation.isPending}
                onClick={confirmDeleteRule}
              >
                {deleteRuleMutation.isPending ? "正在删除..." : "确认删除"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function CreateRuleForm({
  nextPosition,
  onCreated,
  slug,
}: {
  nextPosition: number;
  onCreated: (rule: CommunityRule) => void;
  slug: string;
}) {
  const createRuleMutation = useCreateCommunityRuleMutation();
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      body: "",
      position: nextPosition,
      title: "",
    },
  });
  const titleValue = useWatch({ control: form.control, name: "title" }) ?? "";
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const submitError = createRuleMutation.error
    ? getErrorDescription(createRuleMutation.error)
    : null;

  useEffect(() => {
    form.setValue("position", nextPosition, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [form, nextPosition]);

  async function handleSubmit(values: RuleFormValues) {
    try {
      const result = await createRuleMutation.mutateAsync({
        body: values.body,
        position: values.position,
        slug,
        title: values.title,
      });
      form.reset({
        body: "",
        position: nextPosition + 1,
        title: "",
      });
      onCreated(result.rule);
    } catch {
      // Mutation state drives the visible error alert.
    }
  }

  return (
    <form
      className="space-y-3 border-t border-border pt-3"
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>规则新增失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <RuleFields
        bodyValue={bodyValue}
        disabled={createRuleMutation.isPending}
        form={form}
        idPrefix="create-community-rule"
        titleValue={titleValue}
      />

      <Button type="submit" size="sm" disabled={createRuleMutation.isPending}>
        {createRuleMutation.isPending ? "正在新增..." : "新增规则"}
      </Button>
    </form>
  );
}

function RuleEditForm({
  onCancel,
  onUpdated,
  rule,
  slug,
}: {
  onCancel: () => void;
  onUpdated: (rule: CommunityRule) => void;
  rule: CommunityRule;
  slug: string;
}) {
  const updateRuleMutation = useUpdateCommunityRuleMutation();
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      body: rule.body,
      position: rule.position,
      title: rule.title,
    },
  });
  const titleValue = useWatch({ control: form.control, name: "title" }) ?? "";
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const submitError = updateRuleMutation.error
    ? getErrorDescription(updateRuleMutation.error)
    : null;

  useEffect(() => {
    form.reset({
      body: rule.body,
      position: rule.position,
      title: rule.title,
    });
  }, [form, rule.body, rule.position, rule.title]);

  async function handleSubmit(values: RuleFormValues) {
    try {
      const result = await updateRuleMutation.mutateAsync({
        body: values.body,
        position: values.position,
        rule_id: rule.id,
        slug,
        title: values.title,
      });
      onUpdated(result.rule);
    } catch {
      // Mutation state drives the visible error alert.
    }
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>规则更新失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <RuleFields
        bodyValue={bodyValue}
        disabled={updateRuleMutation.isPending}
        form={form}
        idPrefix={`edit-community-rule-${rule.id}`}
        titleValue={titleValue}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={updateRuleMutation.isPending}>
          {updateRuleMutation.isPending ? "正在保存..." : "保存规则"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={updateRuleMutation.isPending}
          onClick={onCancel}
        >
          取消
        </Button>
      </div>
    </form>
  );
}

function RuleFields({
  bodyValue,
  disabled,
  form,
  idPrefix,
  titleValue,
}: {
  bodyValue: string;
  disabled: boolean;
  form: UseFormReturn<RuleFormValues>;
  idPrefix: string;
  titleValue: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label
          className="text-xs font-semibold text-foreground"
          htmlFor={`${idPrefix}-title`}
        >
          规则标题
        </label>
        <Input
          id={`${idPrefix}-title`}
          disabled={disabled}
          aria-invalid={Boolean(form.formState.errors.title)}
          placeholder="例如：保持讨论相关"
          className="border-border bg-background"
          {...form.register("title")}
        />
        <FieldMeta
          detail={`${titleValue.trim().length} 字`}
          error={form.formState.errors.title?.message}
          hint="标题会显示在规则列表中。"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div className="space-y-2">
          <label
            className="text-xs font-semibold text-foreground"
            htmlFor={`${idPrefix}-position`}
          >
            顺序
          </label>
          <Input
            id={`${idPrefix}-position`}
            type="number"
            min={0}
            step={1}
            disabled={disabled}
            aria-invalid={Boolean(form.formState.errors.position)}
            className="border-border bg-background"
            {...form.register("position", { valueAsNumber: true })}
          />
          <FieldMeta
            error={form.formState.errors.position?.message}
            hint="数字越小越靠前。"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-semibold text-foreground"
            htmlFor={`${idPrefix}-body`}
          >
            规则说明
          </label>
          <Textarea
            id={`${idPrefix}-body`}
            disabled={disabled}
            aria-invalid={Boolean(form.formState.errors.body)}
            placeholder="补充规则说明，可留空。"
            className="min-h-24 border-border bg-background"
            {...form.register("body")}
          />
          <FieldMeta
            detail={`${bodyValue.trim().length} 字`}
            error={form.formState.errors.body?.message}
            hint="说明用于解释规则边界。"
          />
        </div>
      </div>
    </div>
  );
}

function FieldMeta({
  detail,
  error,
  hint,
}: {
  detail?: string;
  error?: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className={error ? "text-destructive" : "text-muted-foreground"}>
        {error ?? hint}
      </p>
      {detail ? (
        <span className={error ? "font-mono text-destructive" : "font-mono text-muted-foreground"}>
          {detail}
        </span>
      ) : null}
    </div>
  );
}

function ManageRail({
  community,
  hasMembers,
  hasRules,
  hasSettings,
  slug,
}: {
  community?: Community;
  hasMembers: boolean;
  hasRules: boolean;
  hasSettings: boolean;
  slug: string;
}) {
  return (
    <aside className="border-t border-border py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">权限上下文</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            当前查看{" "}
            <span className="font-mono text-foreground">/{slug}</span> 的管理入口，
            角色为 {formatViewerRole(community?.viewer_role)}。发帖
            {formatPermission(community?.viewer_permissions?.can_post)}，管理
            {formatPermission(community?.viewer_permissions?.can_manage)}，审核
            {formatPermission(community?.viewer_permissions?.can_moderate)}。
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">管理范围</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <li><span className="font-mono text-primary">01</span> 帖子、评论和待处理举报已接入真实管理读取。</li>
            <li><span className="font-mono text-primary">02</span> 资料和规则写操作走真实后端接口；成员管理仍保持只读。</li>
            <li><span className="font-mono text-primary">03</span> 成员列表只展示真实读取结果，不伪造成员编辑。</li>
          </ol>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">读取状态</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            成员{hasMembers ? "已读取" : "为空或未读取"}，资料
            {hasSettings ? "已读取" : "为空或未读取"}，规则
            {hasRules ? "已读取" : "为空或未读取"}。
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold">稳定出口</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            <TextAction href={`/communities/${encodeURIComponent(slug)}`} variant="bar">
              社区主页
            </TextAction>
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function StatePanel({ children }: { children: ReactNode }) {
  return <div className="border-b border-border py-4">{children}</div>;
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function isForbidden(error: Error | null) {
  return error instanceof ApiError && error.code === "forbidden";
}

function getManageErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "需要登录";
  }

  if (isForbidden(error)) {
    return "需要社区权限";
  }

  return "无法加载社区管理";
}

function getErrorDescription(error: Error | null) {
  if (isForbidden(error)) {
    return "当前账号不是这个社区的 owner 或 moderator，不能查看社区管理。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatViewerRole(role?: string) {
  switch (role) {
    case "owner":
      return "负责人";
    case "moderator":
      return "版主";
    case "member":
      return "成员";
    case "none":
    case "":
    case undefined:
      return "访客";
    default:
      return role;
  }
}

function formatPermission(value?: boolean) {
  return value ? "允许" : "不可用";
}

function formatMemberName(member: CommunityMember) {
  const displayName = member.user.display_name || member.user.username;
  return `${displayName} / @${member.user.username}`;
}

function formatMemberStatus(status: string) {
  switch (status) {
    case "active":
      return "有效";
    case "banned":
      return "已封禁";
    case "left":
      return "已离开";
    default:
      return status;
  }
}

function formatCount(value?: number) {
  return typeof value === "number" ? String(value) : "--";
}

function getNextRulePosition(rules: CommunityRule[]) {
  if (rules.length === 0) {
    return 1;
  }

  return Math.max(...rules.map((rule) => rule.position)) + 1;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatContentStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "removed":
      return "已移除";
    case "deleted":
      return "已删除";
    case "locked":
      return "已锁定";
    case "hidden":
      return "已隐藏";
    default:
      return status;
  }
}

function formatReportStatus(status: string) {
  switch (status) {
    case "pending":
      return "待处理";
    case "resolved":
      return "已处理";
    case "dismissed":
      return "已驳回";
    default:
      return status;
  }
}

function formatReportTarget(targetType: string) {
  switch (targetType) {
    case "post":
      return "帖子";
    case "comment":
      return "评论";
    default:
      return targetType;
  }
}
