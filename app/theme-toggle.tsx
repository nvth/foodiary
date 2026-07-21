"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "foodblog-theme";

type Theme = "light" | "dark";

function getStoredTheme(): Theme | null {
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = (nextTheme: Theme) => {
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };

    const currentTheme = document.documentElement.dataset.theme;
    syncTheme(currentTheme === "dark" ? "dark" : "light");

    const handleSystemTheme = (event: MediaQueryListEvent) => {
      if (!getStoredTheme()) syncTheme(event.matches ? "dark" : "light");
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const storedTheme = getStoredTheme();
      syncTheme(storedTheme ?? (mediaQuery.matches ? "dark" : "light"));
    };

    mediaQuery.addEventListener("change", handleSystemTheme);
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemTheme);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const isDark = theme === "dark";
  const label = isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";

  function toggleTheme() {
    const activeTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme = activeTheme === "dark" ? "light" : "dark";

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The theme still works for this page when storage is unavailable.
    }

    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      className={["theme-toggle", className].filter(Boolean).join(" ")}
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? (
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M20.2 15.2A8.4 8.4 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />
          </svg>
        )}
      </span>
      <span className="theme-toggle-label">{isDark ? "Sáng" : "Tối"}</span>
    </button>
  );
}
