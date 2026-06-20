import type { Metadata } from "next";
import { Suspense } from "react";

import { MessageThreadPage } from "@/features/message/message-thread-page";

import { MessageRouteLoading } from "../message-route-loading";

type MessageConversationRouteProps = {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: MessageConversationRouteProps): Promise<Metadata> {
  const { conversationId } = await params;

  return {
    title: `私信会话 ${conversationId} | CUMT Nexus`,
    description: "查看 CUMT Nexus 私信会话详情。",
  };
}

export default async function MessageConversationRoute({
  params,
  searchParams,
}: MessageConversationRouteProps) {
  const [{ conversationId }, initialSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <Suspense fallback={<MessageRouteLoading />}>
      <MessageThreadPage
        conversationId={conversationId}
        fullscreen
        initialSearchParams={initialSearchParams}
      />
    </Suspense>
  );
}
