import type { Metadata } from "next";
import { Suspense } from "react";

import { MessageCenterPage } from "@/features/message/message-center-page";

import { MessageRouteLoading } from "../message-route-loading";

type MessageRequestsRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "陌生人消息 | CUMT Nexus",
  description: "查看和处理 CUMT Nexus 的陌生人私信请求。",
};

export default async function MessageRequestsRoute({
  searchParams,
}: MessageRequestsRouteProps) {
  const initialSearchParams = await searchParams;

  return (
    <Suspense fallback={<MessageRouteLoading />}>
      <MessageCenterPage
        fullscreen
        initialSearchParams={initialSearchParams}
        showRequestInbox
      />
    </Suspense>
  );
}
