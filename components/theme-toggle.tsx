"use client";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
      <path
        d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M20 15.2A8.5 8.5 0 0 1 8.8 4 9 9 0 1 0 20 15.2Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2 rounded-full"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "切換為淺色模式" : "切換為深色模式"}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
