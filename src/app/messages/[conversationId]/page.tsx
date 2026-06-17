import type { Metadata } from "next";

import { MessageThreadPage } from "@/features/message/message-thread-page";

type MessageConversationRouteProps = {
  params: Promise<{
    conversationId: string;
  }>;
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
}: MessageConversationRouteProps) {
  const { conversationId } = await params;

  return <MessageThreadPage conversationId={conversationId} fullscreen />;
}
