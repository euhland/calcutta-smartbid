"use client";

import { useCallback, useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme") as "dark" | "light" | null;
      if (stored === "dark" || stored === "light") setTheme(stored);
    } catch {
      // localStorage unavailable (e.g. Safari private mode)
    }
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage unavailable (e.g. Safari private mode)
    }
    document.documentElement.setAttribute("data-theme", next);
  }, [theme]);

  return (
    <button
      type="button"
      className="button button-ghost"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? "☀" : "◗"}
    </button>
  );
}
