const ACCESS_TOKEN_KEY = "cumt_nexus_access_token";
const ACCESS_TOKEN_CHANGE_EVENT = "cumt_nexus_access_token_change";

export function readAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function writeAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  emitAccessTokenChange();
}

export function clearAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  emitAccessTokenChange();
}

export function subscribeAccessTokenChange(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === ACCESS_TOKEN_KEY) {
      listener();
    }
  };

  window.addEventListener(ACCESS_TOKEN_CHANGE_EVENT, listener);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(ACCESS_TOKEN_CHANGE_EVENT, listener);
    window.removeEventListener("storage", handleStorageChange);
  };
}

function emitAccessTokenChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ACCESS_TOKEN_CHANGE_EVENT));
}
