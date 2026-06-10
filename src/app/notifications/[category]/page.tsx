import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import {
  isNotificationCategorySegment,
  notificationCategoryOptions,
  notificationCategorySegments,
  type NotificationCategorySegment,
} from "@/features/notification/categories";
import { NotificationCenter } from "@/features/notification/notification-center";

type NotificationCategoryRouteProps = {
  params: Promise<{
    category: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return notificationCategorySegments.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: NotificationCategoryRouteProps): Promise<Metadata> {
  const category = await resolveNotificationCategory(params);

  if (!category) {
    return {
      title: "通知 | CUMT Nexus",
    };
  }

  const label = formatNotificationCategorySegment(category);

  return {
    title: `${label}通知 | CUMT Nexus`,
    description: `查看 CUMT Nexus 的${label}通知、未读状态并标记已读。`,
  };
}

export default async function NotificationCategoryRoute({
  params,
}: NotificationCategoryRouteProps) {
  const category = await resolveNotificationCategory(params);

  if (!category) {
    notFound();
  }

  const label = formatNotificationCategorySegment(category);

  return (
    <AppShell contextLabel={`${label}通知`}>
      <NotificationCenter initialCategory={category} />
    </AppShell>
  );
}

async function resolveNotificationCategory(
  params: NotificationCategoryRouteProps["params"],
) {
  const { category } = await params;

  return isNotificationCategorySegment(category) ? category : null;
}

function formatNotificationCategorySegment(
  category: NotificationCategorySegment,
) {
  return (
    notificationCategoryOptions.find((option) => option.value === category)
      ?.label ?? "分类"
  );
}
