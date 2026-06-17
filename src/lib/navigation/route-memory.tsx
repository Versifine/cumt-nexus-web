"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CURRENT_ROUTE_KEY = "cumt_nexus_current_route";
const MESSAGE_RETURN_TARGET_KEY = "cumt_nexus_message_return_target";

export function RouteMemory() {
  const pathname = usePathname();

  useEffect(() => {
    const currentRoute = getCurrentRoute();
    const previousRoute = window.sessionStorage.getItem(CURRENT_ROUTE_KEY);

    if (isMessageRoute(currentRoute)) {
      const referrerRoute = getSameOriginReferrerRoute();
      const candidate = isUsableMessageReturnTarget(previousRoute)
        ? previousRoute
        : isUsableMessageReturnTarget(referrerRoute)
          ? referrerRoute
          : "";

      if (candidate) {
        window.sessionStorage.setItem(MESSAGE_RETURN_TARGET_KEY, candidate);
      }
    } else {
      window.sessionStorage.setItem(MESSAGE_RETURN_TARGET_KEY, currentRoute);
    }

    window.sessionStorage.setItem(CURRENT_ROUTE_KEY, currentRoute);
  }, [pathname]);

  return null;
}

export function getMessageReturnTarget() {
  if (typeof window === "undefined") {
    return "/";
  }

  const savedTarget = window.sessionStorage.getItem(MESSAGE_RETURN_TARGET_KEY);

  if (isUsableMessageReturnTarget(savedTarget)) {
    return savedTarget;
  }

  const referrerRoute = getSameOriginReferrerRoute();

  if (isUsableMessageReturnTarget(referrerRoute)) {
    return referrerRoute;
  }

  return "/";
}

function getCurrentRoute() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getSameOriginReferrerRoute() {
  if (!document.referrer) {
    return "";
  }

  try {
    const referrerUrl = new URL(document.referrer);

    if (referrerUrl.origin !== window.location.origin) {
      return "";
    }

    return `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`;
  } catch {
    return "";
  }
}

function isUsableMessageReturnTarget(
  route: string | null | undefined,
): route is string {
  return Boolean(route && route.startsWith("/") && !isMessageRoute(route));
}

function isMessageRoute(route: string) {
  const pathname = route.split("#")[0]?.split("?")[0] ?? route;

  return pathname === "/messages" || pathname.startsWith("/messages/");
}
