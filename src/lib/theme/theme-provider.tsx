"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";

type ThemeContextValue = {
  resolvedTheme: ThemeMode;
  setTheme: (theme: ThemePreference) => void;
  theme: ThemePreference;
};

const THEME_STORAGE_KEY = "cumt-nexus:theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const THEME_SYNC_EVENT = "cumt-nexus:theme-change";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia(THEME_MEDIA_QUERY).matches
  ) {
    return "dark";
  }

  return "light";
}

function getServerSystemTheme(): ThemeMode {
  return "dark";
}

function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  return isThemePreference(storedTheme) ? storedTheme : "dark";
}

function getServerThemePreference(): ThemePreference {
  return "dark";
}

function subscribeTheme(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_SYNC_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_SYNC_EVENT, onStoreChange);
  };
}

function subscribeSystemTheme(onStoreChange: () => void) {
  const media = window.matchMedia(THEME_MEDIA_QUERY);

  media.addEventListener("change", onStoreChange);

  return () => media.removeEventListener("change", onStoreChange);
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readThemePreference,
    getServerThemePreference,
  );
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    getServerSystemTheme,
  );

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const liveTheme = readThemePreference();
    const liveSystemTheme = getSystemTheme();
    const liveResolvedTheme = liveTheme === "system" ? liveSystemTheme : liveTheme;

    applyTheme(liveResolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_SYNC_EVENT));
  }, []);

  const value = useMemo(
    () => ({ resolvedTheme, setTheme, theme }),
    [resolvedTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
