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
