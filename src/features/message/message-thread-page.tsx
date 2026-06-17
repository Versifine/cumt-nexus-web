"use client";

import { MessageCenterPage } from "./message-center-page";

export function MessageThreadPage({
  conversationId,
  fullscreen = false,
}: {
  conversationId: string;
  fullscreen?: boolean;
}) {
  return (
    <MessageCenterPage
      activeConversationId={conversationId}
      fullscreen={fullscreen}
    />
  );
}
