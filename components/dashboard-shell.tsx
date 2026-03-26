"use client";

import { useState, useSyncExternalStore } from "react";
import { PanelLeftOpen } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DashboardShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DashboardShell({
  eyebrow,
  title,
  description,
  children,
}: DashboardShellProps) {
  const isSidebarCollapsed = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("good-deed:sidebar-storage", onStoreChange);
      return () => {
        window.removeEventListener("good-deed:sidebar-storage", onStoreChange);
      };
    },
    () => window.localStorage.getItem("good-deed-calendar:sidebar-collapsed") === "true",
    () => false,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  function toggleSidebar() {
    const next = !isSidebarCollapsed;
    window.localStorage.setItem("good-deed-calendar:sidebar-collapsed", String(next));
    window.dispatchEvent(new Event("good-deed:sidebar-storage"));
  }

  return (
    <main className="min-h-screen">
      <div
        className="min-h-screen md:grid md:transition-[grid-template-columns] md:duration-300 md:grid-cols-[300px_minmax(0,1fr)]"
        style={isSidebarCollapsed ? { gridTemplateColumns: "88px minmax(0, 1fr)" } : undefined}
      >
        <div className="hidden md:block">
          <AppSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
        </div>

        <section className="relative min-w-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.16),transparent_30%),radial-gradient(circle_at_right,rgba(59,130,246,0.12),transparent_24%)]" />
          <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <header className="space-y-3">
              <div className="flex items-center justify-between gap-3 md:hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="開啟側邊欄"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              </div>
              <Badge className="rounded-full bg-primary/10 text-primary dark:bg-primary/15">
                {eyebrow}
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">{title}</h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                  {description}
                </p>
              </div>
            </header>

            {children}
          </div>
        </section>
      </div>

      <div
        className={`fixed inset-0 z-50 md:hidden ${isMobileSidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!isMobileSidebarOpen}
      >
        <div
          className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${isMobileSidebarOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[calc(100vw-2.5rem)] max-w-sm transition-transform duration-300 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <AppSidebar
            isCollapsed={false}
            onToggleCollapse={() => setIsMobileSidebarOpen(false)}
            isMobile
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      </div>
    </main>
  );
}
