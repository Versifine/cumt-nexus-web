"use client";

import { MessageCenterPage } from "./message-center-page";

export function MessageThreadPage({
  conversationId,
  fullscreen = false,
  initialSearchParams,
}: {
  conversationId: string;
  fullscreen?: boolean;
  initialSearchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <MessageCenterPage
      activeConversationId={conversationId}
      fullscreen={fullscreen}
      initialSearchParams={initialSearchParams}
    />
  );
}
