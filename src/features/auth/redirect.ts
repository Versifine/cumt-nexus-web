export function getSafeAuthRedirectPath(search: string) {
  const next = new URLSearchParams(search).get("next");

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  if (next === "/login" || next.startsWith("/login?")) {
    return "/";
  }

  if (next === "/register" || next.startsWith("/register?")) {
    return "/";
  }

  return next;
}

export function getSafeAuthSwitchHref(
  target: "/login" | "/register",
  rawNext?: string | string[],
) {
  const next = Array.isArray(rawNext) ? rawNext[0] : rawNext;

  if (!next) {
    return target;
  }

  const safeNext = getSafeAuthRedirectPath(
    `?next=${encodeURIComponent(next)}`,
  );

  if (safeNext === "/") {
    return target;
  }

  return `${target}?next=${encodeURIComponent(safeNext)}`;
}
