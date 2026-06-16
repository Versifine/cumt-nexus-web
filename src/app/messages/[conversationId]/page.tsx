import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { MessageUnavailablePage } from "@/features/message/message-unavailable-page";

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
    description: "查看 CUMT Nexus 私信会话的待接入边界。",
  };
}

export default async function MessageConversationRoute({
  params,
}: MessageConversationRouteProps) {
  const { conversationId } = await params;

  return (
    <AppShell contextLabel="私信会话">
      <MessageUnavailablePage conversationId={conversationId} />
    </AppShell>
  );
}
