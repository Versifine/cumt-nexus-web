import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import {
  isNotificationCategorySegment,
  legacyNotificationCategorySegments,
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
  return [
    ...notificationCategorySegments,
    ...legacyNotificationCategorySegments,
  ].map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: NotificationCategoryRouteProps): Promise<Metadata> {
  const category = await resolveNotificationCategory(params);

  if (category === "legacy") {
    return {
      title: "消息 | CUMT Nexus",
      description: "查看 CUMT Nexus 的互动消息和系统通知。",
    };
  }

  if (!category) {
    return {
      title: "消息 | CUMT Nexus",
    };
  }

  const label = formatNotificationCategorySegment(category);

  return {
    title: `${label}消息 | CUMT Nexus`,
    description: `查看 CUMT Nexus 的${label}。`,
  };
}

export default async function NotificationCategoryRoute({
  params,
}: NotificationCategoryRouteProps) {
  const category = await resolveNotificationCategory(params);

  if (category === "legacy") {
    redirect("/notifications");
  }

  if (!category) {
    notFound();
  }

  const label = formatNotificationCategorySegment(category);

  return (
    <AppShell contextLabel={`${label}消息`}>
      <NotificationCenter initialCategory={category} />
    </AppShell>
  );
}

async function resolveNotificationCategory(
  params: NotificationCategoryRouteProps["params"],
) {
  const { category } = await params;

  if (isNotificationCategorySegment(category)) {
    return category;
  }

  if (
    legacyNotificationCategorySegments.includes(
      category as (typeof legacyNotificationCategorySegments)[number],
    )
  ) {
    return "legacy";
  }

  return null;
}

function formatNotificationCategorySegment(
  category: NotificationCategorySegment,
) {
  return (
    notificationCategoryOptions.find((option) => option.value === category)
      ?.label ?? "分类"
  );
}
