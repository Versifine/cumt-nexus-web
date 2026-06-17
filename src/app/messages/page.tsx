import type { Metadata } from "next";

import { MessageCenterPage } from "@/features/message/message-center-page";

export const metadata: Metadata = {
  title: "私信 | CUMT Nexus",
  description: "查看 CUMT Nexus 的私信会话和陌生人请求。",
};

export default function MessagesRoute() {
  return <MessageCenterPage fullscreen />;
}
