"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LogIn, LogOut, PanelLeftClose, PanelLeftOpen, UserRound } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    href: "/",
    label: "好事日曆",
    description: "查看全站紀錄與新增好事",
    icon: CalendarDays,
  },
  {
    href: "/profile",
    label: "個人介面",
    description: "登入後管理自己的資料",
    icon: UserRound,
  },
];

type AppSidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
};

export function AppSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { currentUser, isLoading, logout } = useAuth();
  const CollapseIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={cn(
        "flex flex-col border-b border-sidebar-border bg-sidebar/92 px-4 py-5 backdrop-blur transition-[padding] duration-300",
        !isMobile && "md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:px-5",
        !isMobile && "min-h-screen",
        isMobile && "h-full min-h-full rounded-r-[2rem] border-r shadow-2xl",
        isCollapsed && "md:px-3",
      )}
    >
      <div className={cn("mb-4 flex", isCollapsed ? "justify-center" : "justify-end")}>
        <button
          type="button"
          aria-label={isMobile ? "關閉側邊欄" : isCollapsed ? "展開側邊欄" : "收合側邊欄"}
          onClick={isMobile ? onCloseMobile : onToggleCollapse}
          className="rounded-2xl border border-sidebar-border bg-background/85 p-2 transition hover:border-primary/30 hover:bg-background"
        >
          <CollapseIcon className="size-5 text-muted-foreground" />
        </button>
      </div>

      <div className="rounded-3xl border border-sidebar-border bg-background/70 p-4 shadow-sm">
        <div className={cn("flex items-start gap-3", isCollapsed && "justify-center")}>
          {!isCollapsed ? (
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">
                {isLoading ? "載入中" : currentUser.isLoggedIn ? currentUser.nickname : "訪客模式"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">{currentUser.status}</p>
            </div>
          ) : (
            <div className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-sidebar-border bg-background/85 text-sm font-semibold">
              {isLoading ? "…" : currentUser.isLoggedIn ? currentUser.nickname.slice(0, 1) : "訪"}
            </div>
          )}
        </div>

        <div className="mt-4">
          {currentUser.isLoggedIn ? (
            <Button
              className={cn("w-full rounded-2xl", isCollapsed && "px-0")}
              onClick={() => void logout().finally(() => onCloseMobile?.())}
              variant="outline"
            >
              <LogOut className="size-4" />
              {!isCollapsed ? "登出" : null}
            </Button>
          ) : (
            <Button asChild className={cn("w-full rounded-2xl", isCollapsed && "px-0")}>
              <Link href="/profile" onClick={() => onCloseMobile?.()}>
                <LogIn className="size-4" />
                {!isCollapsed ? "登入 / 註冊" : null}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <nav className="mt-5 grid gap-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onCloseMobile?.()}
              className={cn(
                "group rounded-3xl border px-4 py-3 transition",
                "hover:border-primary/30 hover:bg-background/75 hover:shadow-sm",
                isCollapsed && "px-3",
                isMobile && "px-3 py-3",
                isActive
                  ? "border-primary/25 bg-background text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground",
              )}
            >
              <div className={cn("flex items-start gap-3", isCollapsed && "justify-center")}>
                <div
                  className={cn(
                    "rounded-2xl border p-2 transition",
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-sidebar-border bg-background/70 group-hover:border-primary/20",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                {!isCollapsed ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className={cn("flex", isCollapsed ? "justify-center" : "justify-end")}>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
