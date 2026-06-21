"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import type { MessageCenterSearchParams } from "./message-center-page";
import type { DmCapability } from "./types";

type MessageDrawerActionProps = {
  activeConversationId?: string | null;
  children: ReactNode;
  className?: string;
  initialSearchParams?: MessageCenterSearchParams;
  title?: string;
  triggerTitle?: string;
};

export type DirectMessageDrawerTarget = {
  activeConversationId?: string;
  disabledReason?: string;
  initialSearchParams?: MessageCenterSearchParams;
};

export function MessageDrawerAction({
  activeConversationId,
  children,
  className,
  initialSearchParams,
  title = "私信",
  triggerTitle,
}: MessageDrawerActionProps) {
  return (
    <Link
      href={getMessageActionHref(activeConversationId, initialSearchParams)}
      className={className}
      title={triggerTitle ?? title}
    >
      {children}
    </Link>
  );
}

function getMessageActionHref(
  activeConversationId?: string | null,
  initialSearchParams?: MessageCenterSearchParams,
) {
  if (activeConversationId) {
    return `/messages/${encodeURIComponent(activeConversationId)}`;
  }

  const params = createMessageActionSearchParams(initialSearchParams);
  const search = params.toString();

  return search ? `/messages?${search}` : "/messages";
}

function createMessageActionSearchParams(input: MessageCenterSearchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  return params;
}

export function getDirectMessageDrawerTarget(
  username: string,
  capability?: DmCapability | null,
): DirectMessageDrawerTarget {
  if (!capability) {
    return {
      initialSearchParams: {
        to: username,
      },
    };
  }

  if (capability.viewer_relation === "self") {
    return {
      disabledReason: formatDmCapabilityReason(capability.reason ?? "self"),
    };
  }

  if (capability.reason !== "unauthenticated" && !capability.can_start) {
    return {
      disabledReason: formatDmCapabilityReason(capability.reason),
    };
  }

  if (capability.direct_conversation_id) {
    return {
      activeConversationId: capability.direct_conversation_id,
    };
  }

  return {
    initialSearchParams: {
      to: username,
    },
  };
}

export function formatDmCapabilityReason(reason?: string | null) {
  switch (reason) {
    case "blocked":
      return "已拉黑";
    case "privacy":
      return "对方限制私信";
    case "self":
      return "本人";
    case "unavailable":
      return "账号不可用";
    case "unauthenticated":
      return "登录后私信";
    default:
      return "暂不可私信";
  }
}
