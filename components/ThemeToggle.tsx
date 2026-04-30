"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="btn-ghost"
      aria-label={dark ? "Mode clair" : "Mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
