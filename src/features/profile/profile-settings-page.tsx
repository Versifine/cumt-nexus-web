"use client";

import { useEffect, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useAppShellBackAction } from "@/components/app-shell/app-shell";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { AuthRequired } from "@/features/auth/auth-required";
import { useCurrentUserQuery } from "@/features/auth/queries";
import {
  usePublicUserQuery,
  useUpdateProfileMutation,
} from "@/features/profile/queries";
import { ProfileMediaEditor } from "@/features/profile/profile-media-editor";
import {
  formatDate,
  getDisplayName,
  ProfileAvatar,
  ProfileBanner,
} from "@/features/profile/public-user-layout";
import type { PublicUser } from "@/features/profile/types";
import { ApiError } from "@/lib/api/client";

const profileSettingsSchema = z.object({
  bio: z.string().trim().max(300, "简介不能超过 300 字。"),
  display_name: z.string().trim().max(40, "展示名不能超过 40 字。"),
  headline: z.string().trim().max(80, "签名不能超过 80 字。"),
});

type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;

export function ProfileSettingsPage() {
  return (
    <AuthRequired
      title="登录后编辑主页"
      description="个人主页资料属于当前账号。登录后可以维护公开头像、背景图和简介。"
    >
      <ProfileSettingsContent />
    </AuthRequired>
  );
}

function ProfileSettingsContent() {
  const currentUserQuery = useCurrentUserQuery();
  const username = currentUserQuery.data?.username ?? "";
  const profileQuery = usePublicUserQuery(
    username,
    currentUserQuery.isSuccess && Boolean(username),
  );
  const user = profileQuery.data?.user;
  const profileHref = user ? `/users/${encodeURIComponent(user.username)}` : null;

  useAppShellBackAction(
    profileHref
      ? {
          href: profileHref,
          label: "返回个人主页",
        }
      : null,
  );

  if (currentUserQuery.isLoading || profileQuery.isPending) {
    return (
      <section className="border border-border bg-background p-4">
        <LoadingState rows={4} />
      </section>
    );
  }

  if (profileQuery.isError || !user) {
    return (
      <section className="border border-border bg-background p-4">
        <ErrorState
          title="无法加载公开资料"
          description={getErrorDescription(profileQuery.error)}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => profileQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <ProfileSettingsForm user={user} />
  );
}

function ProfileSettingsForm({
  user,
}: {
  user: PublicUser;
}) {
  const router = useRouter();
  const updateMutation = useUpdateProfileMutation();
  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: getProfileFormValues(user),
  });
  const watchedValues = useWatch({ control: form.control });
  const previewUser = buildPreviewUser(user, watchedValues);
  const isDirty = form.formState.isDirty;
  const isSaving = updateMutation.isPending;

  useEffect(() => {
    form.reset(getProfileFormValues(user));
  }, [form, user]);

  async function handleSubmit(values: ProfileSettingsFormValues) {
    const result = await updateMutation.mutateAsync(values);

    form.reset(getProfileFormValues(result.user));
    router.push(getProfileHref(result.user.username));
  }

  function handleMediaSaved(nextUser: PublicUser) {
    router.push(getProfileHref(nextUser.username));
  }

  function handleReset() {
    updateMutation.reset();
    form.reset(getProfileFormValues(user));
  }

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-5 py-4 xl:grid-cols-[minmax(0,900px)_300px]">
      <section className="min-w-0 bg-background">
        <div className="px-3 pb-4 pt-1 sm:px-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <StatusToken tone="primary">个人主页工作台</StatusToken>
              <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-normal">
                编辑主页
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                直接调整别人看到的头像、背景图和公开文字资料；媒体保存和文字保存分开处理，避免误覆盖。
              </p>
            </div>
            <StatusToken tone={isDirty ? "warning" : "success"}>
              {isDirty ? "文字资料未保存" : "文字资料已同步"}
            </StatusToken>
          </div>
        </div>

        <section className="px-3 sm:px-4">
          <div className="overflow-hidden bg-background-soft/45">
            <div className="relative">
              <ProfileBanner user={user} />
              <div className="absolute bottom-3 right-3 z-20">
                <ProfileMediaEditor
                  kind="banner"
                  onSaved={handleMediaSaved}
                  triggerVariant="banner"
                  user={user}
                />
              </div>
            </div>

            <div className="px-3 pb-5 sm:px-4">
              <div className="relative z-10 -mt-12 flex items-end justify-between gap-3 sm:-mt-16">
                <div className="relative shrink-0">
                  <ProfileAvatar size="hero" user={user} />
                  <ProfileMediaEditor
                    className="absolute -bottom-1 -right-1"
                    kind="avatar"
                    onSaved={handleMediaSaved}
                    triggerLabel="更换头像"
                    triggerVariant="avatar"
                    user={user}
                  />
                </div>
              </div>

              <div className="mt-4 min-w-0">
                <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
                  <h2 className="break-words text-2xl font-semibold leading-8 tracking-normal sm:text-3xl sm:leading-10">
                    {getDisplayName(previewUser)}
                  </h2>
                  <p className="pb-1 font-mono text-xs text-primary">
                    @{user.username}
                  </p>
                </div>
                {previewUser.headline ? (
                  <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-foreground">
                    {previewUser.headline}
                  </p>
                ) : null}
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {previewUser.bio || "这个用户还没有填写公开简介。"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form
          className="px-3 py-4 sm:px-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          {updateMutation.isSuccess && !isDirty ? (
            <Alert variant="success" className="mb-4">
              <AlertTitle>文字资料已保存</AlertTitle>
              <AlertDescription>
                公开展示名、签名和简介已经写入后端，刷新后仍会保留。
              </AlertDescription>
            </Alert>
          ) : null}

          {updateMutation.isError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>保存失败</AlertTitle>
              <AlertDescription>
                {getErrorDescription(updateMutation.error)}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="min-w-0">
              <StatusToken>文字资料</StatusToken>
              <h2 className="mt-3 text-base font-semibold">主页文字</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                这里的改动需要点击保存。头像和背景图在上方单独保存。
              </p>
            </div>

            <div className="min-w-0 bg-background-soft/30">
              <ProfileSettingsField
                description="展示在个人主页头像旁边。留空时使用用户名。"
                htmlFor="profile-display-name"
                index="01"
                title="展示名"
              >
                <Input
                  id="profile-display-name"
                  aria-invalid={Boolean(form.formState.errors.display_name)}
                  className="border-border bg-background"
                  disabled={isSaving}
                  placeholder="你的展示名"
                  {...form.register("display_name")}
                />
                <FieldMeta
                  count={(watchedValues.display_name ?? "").trim().length}
                  error={form.formState.errors.display_name?.message}
                  hint="最多 40 字。"
                />
              </ProfileSettingsField>

              <ProfileSettingsField
                description="一句话说明你在校园社区里的身份或兴趣。"
                htmlFor="profile-headline"
                index="02"
                title="签名"
              >
                <Input
                  id="profile-headline"
                  aria-invalid={Boolean(form.formState.errors.headline)}
                  className="border-border bg-background"
                  disabled={isSaving}
                  placeholder="例如：关注校园生活和课程资料"
                  {...form.register("headline")}
                />
                <FieldMeta
                  count={(watchedValues.headline ?? "").trim().length}
                  error={form.formState.errors.headline?.message}
                  hint="最多 80 字。"
                />
              </ProfileSettingsField>

              <ProfileSettingsField
                description="更完整的公开简介，会展示在个人主页和右侧上下文栏。"
                htmlFor="profile-bio"
                index="03"
                title="简介"
              >
                <Textarea
                  id="profile-bio"
                  aria-invalid={Boolean(form.formState.errors.bio)}
                  className="min-h-36 border-border bg-background"
                  disabled={isSaving}
                  placeholder="写一点你希望公开展示的介绍。"
                  {...form.register("bio")}
                />
                <FieldMeta
                  count={(watchedValues.bio ?? "").trim().length}
                  error={form.formState.errors.bio?.message}
                  hint="最多 300 字。"
                />
              </ProfileSettingsField>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              保存会更新公开主页，其他人访问你的主页时会看到这些文字资料。
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!isDirty || isSaving}
                onClick={handleReset}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                还原
              </Button>
              <Button type="submit" disabled={!isDirty || isSaving}>
                <Save className="size-4" aria-hidden="true" />
                {isSaving ? "保存中" : "保存文字资料"}
              </Button>
            </div>
          </div>
        </form>
      </section>

      <ProfileSettingsRail
        isDirty={isDirty}
        isSaving={isSaving}
        user={previewUser}
      />
    </div>
  );
}

function ProfileSettingsRail({
  isDirty,
  isSaving,
  user,
}: {
  isDirty: boolean;
  isSaving: boolean;
  user: PublicUser;
}) {
  return (
    <aside className="hidden min-w-0 xl:block">
      <div className="sticky top-20 space-y-5">
        <section className="bg-background-soft/35 px-4 py-4">
          <h2 className="text-sm font-semibold">保存状态</h2>
          <div className="mt-3 space-y-2">
            <SaveStateRow
              active={!isSaving}
              label="头像"
              text="在预览头像角落单独保存"
            />
            <SaveStateRow
              active={!isSaving}
              label="背景图"
              text="在头图右下角单独保存"
            />
            <SaveStateRow
              active={!isDirty}
              label="文字"
              text={isDirty ? "还有未保存修改" : "已同步到后端"}
            />
          </div>
        </section>

        <section className="bg-background-soft/35 px-4 py-4">
          <h2 className="text-sm font-semibold">文字预览</h2>
          <div className="mt-3 bg-background/60 px-3">
            <InfoRow label="展示名" value={user.display_name || user.username} />
            <InfoRow label="签名" value={user.headline || "未设置"} />
            <InfoRow label="加入" value={formatDate(user.created_at)} />
          </div>
        </section>

        <section className="bg-background-soft/35 px-4 py-4">
          <h2 className="text-sm font-semibold">入口</h2>
          <div className="mt-3 flex flex-col bg-background/60">
            <TextAction
              href={`/users/${encodeURIComponent(user.username)}`}
              variant="bar"
            >
              查看个人主页
            </TextAction>
            <TextAction href="/saved" variant="bar">
              我的收藏
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function SaveStateRow({
  active,
  label,
  text,
}: {
  active: boolean;
  label: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 bg-background/60 px-3 py-3">
      <CheckCircle2
        className={active ? "mt-0.5 size-4 text-primary" : "mt-0.5 size-4 text-warning"}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function ProfileSettingsField({
  children,
  description,
  htmlFor,
  index,
  title,
}: {
  children: ReactNode;
  description: string;
  htmlFor: string;
  index: string;
  title: string;
}) {
  return (
    <div className="grid gap-4 px-3 py-5 md:grid-cols-[160px_minmax(0,1fr)]">
      <div>
        <label
          className="flex items-center gap-3 text-sm font-semibold text-foreground"
          htmlFor={htmlFor}
        >
          <span className="font-mono text-xs text-primary">{index}</span>
          {title}
        </label>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="min-w-0 space-y-2">{children}</div>
    </div>
  );
}

function FieldMeta({
  count,
  error,
  hint,
}: {
  count: number;
  error?: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className={error ? "text-destructive" : "text-muted-foreground"}>
        {error ?? hint}
      </p>
      <span className="font-mono text-muted-foreground">{count} 字</span>
    </div>
  );
}

function getProfileFormValues(user: PublicUser): ProfileSettingsFormValues {
  return {
    bio: user.bio ?? "",
    display_name: user.display_name ?? "",
    headline: user.headline ?? "",
  };
}

function buildPreviewUser(
  user: PublicUser,
  values: Partial<ProfileSettingsFormValues>,
): PublicUser {
  return {
    ...user,
    bio: values.bio ?? user.bio ?? "",
    display_name: values.display_name ?? user.display_name ?? "",
    headline: values.headline ?? user.headline ?? "",
  };
}

function getProfileHref(username: string) {
  return `/users/${encodeURIComponent(username)}`;
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "当前账号已确认，但公开主页资料读取或保存失败。请稍后重试。";
}
