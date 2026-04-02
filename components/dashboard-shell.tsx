"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PanelLeftOpen, Sparkles, X } from "lucide-react";

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
  const [earnedBadges, setEarnedBadges] = useState<number[]>([]);

  useEffect(() => {
    const handleBadgeEarned = (event: Event) => {
      const detail = (event as CustomEvent<{ badges?: number[] }>).detail;
      const badges = (detail?.badges ?? []).filter((badge) => Number.isFinite(badge));

      if (!badges.length) {
        return;
      }

      setEarnedBadges(badges);
    };

    window.addEventListener("good-deed:badge-earned", handleBadgeEarned as EventListener);

    return () => {
      window.removeEventListener("good-deed:badge-earned", handleBadgeEarned as EventListener);
    };
  }, []);

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

      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center px-4 transition ${earnedBadges.length ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!earnedBadges.length}
      >
        <div
          className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
          onClick={() => setEarnedBadges([])}
        />
        <section className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(240,244,251,0.96)_30%,rgba(214,223,236,0.96)_68%,rgba(255,255,255,0.9))] p-6 text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(44,53,67,0.96),rgba(83,94,111,0.94)_34%,rgba(28,35,45,0.98)_68%,rgba(124,138,158,0.88))] dark:text-white">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-b-[2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),transparent_68%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_72%)]" />
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-slate-400/20 bg-white/40 text-slate-700 transition hover:bg-white/70 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            aria-label="關閉提示"
            onClick={() => setEarnedBadges([])}
          >
            <X className="size-4" />
          </button>

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/55 bg-amber-100/75 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-amber-900 dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-100">
              <Sparkles className="size-3.5" />
              BADGE UNLOCKED
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {earnedBadges.length > 1 ? "你今天解鎖了新的連續徽章" : "你今天解鎖了新的連續徽章"}
              </h2>
              <p className="text-sm leading-7 text-slate-700 dark:text-slate-200/90">
                {earnedBadges.length > 1
                  ? `這次新增後，你一共新取得了 ${earnedBadges.join("、")} 天徽章。`
                  : `這次新增後，你已取得 ${earnedBadges[0] ?? ""} 天徽章。`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/60 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-white/8">
                <p className="text-xs font-medium tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                  新徽章
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {earnedBadges.map((badge) => (
                    <div
                      key={badge}
                      className="rounded-[1.4rem] border border-amber-300/35 bg-amber-50/70 p-2 dark:border-amber-200/15 dark:bg-white/6"
                    >
                      <div className="relative mx-auto aspect-square w-full max-w-[8.5rem]">
                        <Image
                          src={`/badges/streak-${badge}.png`}
                          alt={`${badge} 天徽章`}
                          fill
                          sizes="160px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/60 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-white/8">
                <p className="text-xs font-medium tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                  徽章規則
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-100/90">
                  每個門檻只會在第一次達成時通知一次，中斷後再次達到舊門檻也不會重複通知。
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                className="rounded-full px-5"
                onClick={() => setEarnedBadges([])}
              >
                繼續查看徽章
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
