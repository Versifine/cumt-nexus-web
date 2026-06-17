import type { Metadata } from "next";

import { MessageCenterPage } from "@/features/message/message-center-page";

export const metadata: Metadata = {
  title: "陌生人消息 | CUMT Nexus",
  description: "查看和处理 CUMT Nexus 的陌生人私信请求。",
};

export default function MessageRequestsRoute() {
  return <MessageCenterPage fullscreen showRequestInbox />;
}
