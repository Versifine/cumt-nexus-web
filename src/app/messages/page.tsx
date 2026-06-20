import type { Metadata } from "next";
import { Suspense } from "react";

import { MessageCenterPage } from "@/features/message/message-center-page";

import { MessageRouteLoading } from "./message-route-loading";

type MessagesRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "私信 | CUMT Nexus",
  description: "查看 CUMT Nexus 的私信会话和陌生人请求。",
};

export default async function MessagesRoute({ searchParams }: MessagesRouteProps) {
  const initialSearchParams = await searchParams;

  return (
    <Suspense fallback={<MessageRouteLoading />}>
      <MessageCenterPage
        fullscreen
        initialSearchParams={initialSearchParams}
      />
    </Suspense>
  );
}
