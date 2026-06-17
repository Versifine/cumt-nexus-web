"use client";

import { useState } from "react";
import { ToggleLeft } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { ApiError } from "@/lib/api/client";

import {
  AdminActionDialog,
  AdminAuditLink,
  AdminDetailRail,
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminQueueLayout,
  AdminQueueToolbar,
  AdminRailSection,
  AdminResourceRow,
} from "./admin-queue";
import {
  describeAdminSetting,
  formatAdminSettingKey,
  formatDateTime,
  formatShortId,
} from "./display";
import {
  useAdminSettingsQuery,
  useUpdateAdminSettingMutation,
} from "./queries";
import type { AdminSetting } from "./types";

const expectedSettings = [
  "registration_enabled",
  "posting_enabled",
  "upload_enabled",
];

type SettingView = {
  isPersisted: boolean;
  key: string;
  setting?: AdminSetting;
};

export function AdminSettingsPage() {
  const [selectedSettingKey, setSelectedSettingKey] = useState(expectedSettings[0]);
  const settingsQuery = useAdminSettingsQuery();
  const settings = settingsQuery.data?.settings ?? [];
  const byKey = new Map(settings.map((setting) => [setting.key, setting]));
  const settingViews = expectedSettings.map((key) => ({
    isPersisted: byKey.has(key),
    key,
    setting: byKey.get(key),
  }));
  const selectedSetting =
    settingViews.find((setting) => setting.key === selectedSettingKey) ??
    settingViews[0] ??
    null;

  return (
    <AdminQueueLayout detail={<SettingDetailRail settingView={selectedSetting} />}>
      <AdminQueueToolbar
        description="关闭开关会影响真实用户流程，必须二次确认。"
        isRefreshing={settingsQuery.isFetching}
        onRefresh={() => {
          void settingsQuery.refetch();
        }}
        title="运行开关队列"
      />

      {settingsQuery.isPending ? <AdminLoadingPanel rows={4} /> : null}

      {settingsQuery.isError ? (
        <AdminErrorPanel
          title="无法加载运行开关"
          description={getErrorDescription(settingsQuery.error)}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => settingsQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {settingsQuery.isSuccess ? (
        <div className="border-b border-border">
          {settingViews.map((settingView, index) => {
            const enabled = settingView.setting?.enabled ?? true;

            return (
              <AdminResourceRow
                key={settingView.key}
                index={index}
                isSelected={selectedSetting?.key === settingView.key}
                onSelect={() => setSelectedSettingKey(settingView.key)}
                icon={<ToggleLeft className="size-4" aria-hidden="true" />}
                title={formatAdminSettingKey(settingView.key)}
                tokens={
                  <>
                    <StatusToken tone={enabled ? "success" : "warning"}>
                      {enabled ? "启用" : "关闭"}
                    </StatusToken>
                    {!settingView.setting ? <StatusToken>默认启用</StatusToken> : null}
                  </>
                }
                description={describeAdminSetting(settingView.key)}
                meta={
                  settingView.setting
                    ? `更新 ${formatDateTime(settingView.setting.updated_at)} · 操作人 ${formatShortId(settingView.setting.updated_by)}`
                    : "后端未返回配置行，当前按默认启用展示。"
                }
                actions={<StatusToken>{settingView.isPersisted ? "可调整" : "只读"}</StatusToken>}
              />
            );
          })}
        </div>
      ) : null}
    </AdminQueueLayout>
  );
}

function SettingDetailRail({ settingView }: { settingView: SettingView | null }) {
  const setting = settingView?.setting;
  const enabled = setting?.enabled ?? true;

  return (
    <>
      <AdminDetailRail title="开关上下文" emptyTitle="选择开关">
        {settingView ? (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusToken tone={enabled ? "success" : "warning"}>
                  {enabled ? "启用" : "关闭"}
                </StatusToken>
                {!setting ? <StatusToken>默认启用</StatusToken> : null}
              </div>
              <h3 className="mt-3 break-words text-lg font-semibold">
                {formatAdminSettingKey(settingView.key)}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {describeAdminSetting(settingView.key)}
              </p>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              <InfoRow label="配置键" value={settingView.key} />
              <InfoRow
                label="更新人"
                value={setting ? formatShortId(setting.updated_by) : "未落库"}
              />
              <InfoRow
                label="更新时间"
                value={setting ? formatDateTime(setting.updated_at) : "未落库"}
              />
            </dl>
            <SettingAction setting={setting} settingKey={settingView.key} />
          </div>
        ) : null}
      </AdminDetailRail>

      <AdminRailSection title="开关说明">
        <p className="text-sm leading-6 text-muted-foreground">
          后端未返回某个开关行时，运行时按默认启用处理。前端只展示只读提示，不伪造已保存配置。
        </p>
      </AdminRailSection>

      <AdminRailSection title="相关入口">
        <div className="flex flex-col border-t border-border">
          <AdminAuditLink targetType="admin_setting" targetId={settingView?.key} />
          <TextAction href="/admin/owner-transfer" variant="bar">
            负责人交接
          </TextAction>
          <TextAction href="/admin" variant="bar">
            平台总览
          </TextAction>
        </div>
      </AdminRailSection>
    </>
  );
}

function SettingAction({
  setting,
  settingKey,
}: {
  setting?: AdminSetting;
  settingKey: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useUpdateAdminSettingMutation();
  const isPersisted = Boolean(setting);
  const enabled = setting?.enabled ?? true;
  const nextEnabled = !enabled;

  async function submit() {
    await mutation.mutateAsync({
      key: settingKey,
      input: { enabled: nextEnabled },
    });
    setMessage(`${formatAdminSettingKey(settingKey)}已${nextEnabled ? "启用" : "关闭"}。`);
    setOpen(false);
  }

  if (!isPersisted) {
    return (
      <Alert>
        <AlertTitle>当前只读</AlertTitle>
        <AlertDescription>
          后端未返回配置行，当前按默认启用展示；需要后端落库后才能调整。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {message ? (
        <Alert variant="success">
          <AlertTitle>设置已更新</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <AdminActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`${nextEnabled ? "启用" : "关闭"}${formatAdminSettingKey(settingKey)}`}
        description={`${describeAdminSetting(settingKey)}${nextEnabled ? "确认恢复该能力。" : "确认关闭前请确认不会影响正在进行的用户操作。"}`}
        confirmLabel="确认"
        confirmVariant={nextEnabled ? "default" : "destructive"}
        isSubmitting={mutation.isPending}
        error={mutation.error ? getErrorDescription(mutation.error) : null}
        onConfirm={submit}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => {
              setMessage(null);
              setOpen(true);
            }}
          >
            {enabled ? "关闭开关" : "启用开关"}
          </Button>
        }
      />
    </>
  );
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
