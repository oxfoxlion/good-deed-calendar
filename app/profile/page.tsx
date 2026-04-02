"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { BadgeCheck, Check, ChevronLeft, ChevronRight, Flame, Lock, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { GoodDeedComposer } from "@/components/good-deed-composer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CALENDAR_TIME_ZONE = "Asia/Taipei";
const STREAK_BADGE_DAYS = [7, 14, 28, 50, 100];

type ProfileData = {
  month: string;
  total_entries: number;
  last_entry_at: string | null;
  active_dates_this_month: string[];
  streak_summary: {
    current_streak: number;
    longest_streak: number;
    next_badge_days: number | null;
    badges: Array<{
      days: number;
      earned: boolean;
    }>;
  };
  month_entries: Array<{
    id: string;
    date: string;
    content: string;
    created_at: string;
  }>;
  recent_entries: Array<{
    id: string;
    date: string;
    content: string;
    created_at: string;
  }>;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarNowParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "1970");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "01");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "01");

  return { year, month, day };
}

function getTodayDateKey() {
  const { year, month, day } = getCalendarNowParts();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getEarliestAllowedDateKey() {
  const { year, month } = getCalendarNowParts();
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousMonthYear = month === 1 ? year - 1 : year;
  return `${previousMonthYear}-${String(previousMonth).padStart(2, "0")}-01`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "long",
  }).format(date);
}

function buildCalendarDays(currentMonth: Date) {
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
      isToday: toDateKey(date) === getTodayDateKey(),
    };
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "尚無紀錄";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDefaultStreakSummary() {
  return {
    current_streak: 0,
    longest_streak: 0,
    next_badge_days: STREAK_BADGE_DAYS[0],
    badges: STREAK_BADGE_DAYS.map((days) => ({
      days,
      earned: false,
    })),
  };
}

function MetalBadgeCard({
  days,
  earned,
}: {
  days: number;
  earned: boolean;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border p-4 transition sm:p-5",
        earned
          ? "border-amber-200/75 bg-[linear-gradient(145deg,rgba(255,247,214,0.98),rgba(233,207,122,0.92)_28%,rgba(176,126,36,0.9)_62%,rgba(255,244,202,0.96))] text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_18px_32px_rgba(176,126,36,0.2)] dark:border-amber-200/20 dark:bg-[linear-gradient(145deg,rgba(78,61,22,0.96),rgba(198,154,52,0.7)_30%,rgba(87,63,20,0.96)_62%,rgba(240,213,126,0.34))] dark:text-amber-50"
          : "border-slate-300/70 bg-[linear-gradient(145deg,rgba(249,250,252,0.96),rgba(214,221,231,0.9)_32%,rgba(148,163,184,0.78)_66%,rgba(244,247,251,0.94))] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_14px_24px_rgba(148,163,184,0.14)] dark:border-slate-200/10 dark:bg-[linear-gradient(145deg,rgba(53,62,74,0.96),rgba(116,129,145,0.72)_30%,rgba(41,49,60,0.98)_66%,rgba(185,194,205,0.18))] dark:text-slate-100",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-3 top-0 h-16 rounded-b-[1.5rem]",
          earned
            ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,248,220,0.22),transparent_74%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),transparent_72%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_76%)]",
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-sm",
              earned ? "text-stone-700/85 dark:text-amber-100/80" : "text-slate-600 dark:text-slate-300/80",
            )}
          >
            連續徽章
          </p>
          <p className="mt-2 text-2xl font-semibold">{days} 天</p>
        </div>
        {earned ? (
          <BadgeCheck className="size-5 shrink-0 text-amber-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.55)] dark:text-amber-200" />
        ) : (
          <Lock className="size-5 shrink-0 text-slate-500 dark:text-slate-300/75" />
        )}
      </div>
      <p
        className={cn(
          "mt-4 text-sm leading-6",
          earned ? "text-stone-700 dark:text-amber-50/90" : "text-slate-600 dark:text-slate-200/82",
        )}
      >
        {earned
          ? "已領取，之後再次達到相同門檻不會重複發放。"
          : `尚未達成，累積到連續 ${days} 天即可解鎖。`}
      </p>
    </article>
  );
}

export default function ProfilePage() {
  const { currentUser, isLoading } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const { year, month } = getCalendarNowParts();
    return new Date(year, month - 1, 1);
  });
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const calendarDays = buildCalendarDays(currentMonth);
  const activeDateSet = new Set(profileData?.active_dates_this_month ?? []);
  const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const latestAllowedDate = getTodayDateKey();
  const earliestAllowedDate = getEarliestAllowedDateKey();
  const selectedDateEntries = selectedDate
    ? (profileData?.month_entries ?? []).filter((entry) => entry.date === selectedDate)
    : [];
  const streakSummary = profileData?.streak_summary ?? getDefaultStreakSummary();
  const remainingDays = streakSummary.next_badge_days
    ? Math.max(streakSummary.next_badge_days - streakSummary.current_streak, 0)
    : 0;

  const loadProfile = useEffectEvent(async () => {
    setIsProfileLoading(true);

    try {
      const response = await fetch(`/api/profile?month=${monthKey}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response.json()) as {
        profile?: ProfileData;
      };

      if (!response.ok || !data.profile) {
        setProfileData(null);
        return;
      }

      setProfileData(data.profile);
    } finally {
      setIsProfileLoading(false);
    }
  });

  useEffect(() => {
    if (!currentUser.isLoggedIn) {
      setProfileData(null);
      setSelectedDate(null);
      return;
    }

    void loadProfile();
  }, [currentUser.isLoggedIn, monthKey]);

  useEffect(() => {
    setSelectedDate(null);
  }, [monthKey]);

  useEffect(() => {
    if (!currentUser.isLoggedIn) {
      return;
    }

    const handleEntryCreated = () => {
      void loadProfile();
    };

    window.addEventListener("good-deed:entry-created", handleEntryCreated);

    return () => {
      window.removeEventListener("good-deed:entry-created", handleEntryCreated);
    };
  }, [currentUser.isLoggedIn]);

  return (
    <DashboardShell
      eyebrow="PERSONAL SPACE"
      title="個人介面"
      description="登入後可查看個人資料與自己的好事紀錄。"
    >
      {isLoading ? (
        <Card className="border-border/80 bg-card/85">
          <CardContent className="p-6 text-sm text-muted-foreground">正在讀取登入狀態...</CardContent>
        </Card>
      ) : currentUser.isLoggedIn ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[0.92fr_1.08fr]">
            <GoodDeedComposer
              earliestAllowedDate={earliestAllowedDate}
              latestAllowedDate={latestAllowedDate}
              description="新增後會同步更新你的月曆與最近紀錄。"
              className="xl:col-start-2 xl:row-start-1"
            />

            <Card className="border-border/80 bg-card/85 xl:col-start-1 xl:row-start-1 xl:row-span-2">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{monthLabel(currentMonth)}</CardTitle>
                    <CardDescription>{currentUser.nickname} 的好事集點卡</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="上一個月份"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
                        )
                      }
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="下一個月份"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
                        )
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:gap-2 sm:text-[11px] sm:tracking-[0.2em]">
                  {weekdays.map((weekday) => (
                    <span key={weekday}>{weekday}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarDays.map((day) => {
                    const hasEntry = activeDateSet.has(day.key);

                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => setSelectedDate(day.key)}
                        className={cn(
                          "flex min-h-10 flex-col items-center justify-center rounded-xl border bg-background/70 px-1 text-center transition hover:border-primary/40 hover:bg-accent sm:min-h-12 sm:rounded-2xl",
                          !day.isCurrentMonth && "opacity-30",
                          day.isToday && "border-primary/50",
                          hasEntry && "border-emerald-500/30 bg-emerald-500/10",
                          selectedDate === day.key && "border-primary ring-2 ring-primary/25",
                        )}
                      >
                        <span className="text-[11px] font-medium sm:text-xs">{day.date.getDate()}</span>
                        <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full sm:mt-1 sm:h-5 sm:w-5">
                          {hasEntry ? (
                            <Check className="size-3.5 text-emerald-600 dark:text-emerald-300 sm:size-4" />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">本月打勾天數</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {isProfileLoading ? "讀取中..." : `${activeDateSet.size} 天`}
                    </p>
                  </div>
                  <div className="rounded-3xl border bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">個人累積</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {isProfileLoading ? "讀取中..." : `${profileData?.total_entries ?? 0} 筆`}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">註冊時間</p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(currentUser.created_at)}</p>
                  </div>
                  <div className="rounded-3xl border bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">最近新增</p>
                    <p className="mt-2 text-sm font-medium">
                      {isProfileLoading ? "讀取中..." : formatDateTime(profileData?.last_entry_at ?? null)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 xl:col-start-2 xl:row-start-2">
              <CardHeader>
                <CardTitle>{selectedDate ? `${selectedDate} 的紀錄` : "最近的個人紀錄"}</CardTitle>
                <CardDescription>
                  {selectedDate ? "目前顯示你在這一天新增的好事。" : "未選日期時，顯示登入帳號自己的最新紀錄。"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isProfileLoading ? (
                  <div className="rounded-3xl border border-dashed bg-secondary/35 p-4 text-sm text-muted-foreground">
                    正在讀取個人紀錄...
                  </div>
                ) : selectedDate ? (
                  selectedDateEntries.length ? (
                    selectedDateEntries.map((entry) => (
                      <article key={entry.id} className="rounded-3xl border bg-background/75 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                            {entry.content}
                          </p>
                          <span className="shrink-0 text-sm text-muted-foreground">{entry.date}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed bg-secondary/35 p-4 text-sm text-muted-foreground">
                      這一天沒有屬於這個帳號的紀錄。
                    </div>
                  )
                ) : profileData?.recent_entries.length ? (
                  profileData.recent_entries.map((entry) => (
                    <article key={entry.id} className="rounded-3xl border bg-background/75 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                          {entry.content}
                        </p>
                        <span className="shrink-0 text-sm text-muted-foreground">{entry.date}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed bg-secondary/35 p-4 text-sm text-muted-foreground">
                    目前還沒有屬於這個帳號的紀錄。
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

            <Card className="border-border/80 bg-card/85">
              <CardHeader>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="space-y-1 text-left">
                    <CardTitle>連續徽章</CardTitle>
                    <CardDescription className="max-w-2xl">
                      曾達成的門檻會永久保留，不會因中斷而重複領取同一徽章。
                    </CardDescription>
                    <div className="rounded-3xl border bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {streakSummary.next_badge_days
                          ? `下一枚徽章是 ${streakSummary.next_badge_days} 天，再持續 ${remainingDays} 天就能達成。`
                          : "所有連續徽章都已解鎖。"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[18rem]">
                    <div className="rounded-3xl border bg-background/70 px-4 py-3">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Flame className="size-4 text-orange-500" />
                        目前連續
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{streakSummary.current_streak} 天</p>
                    </div>
                    <div className="rounded-3xl border bg-background/70 px-4 py-3">
                      <p className="text-sm text-muted-foreground">最佳紀錄</p>
                      <p className="mt-2 text-2xl font-semibold">{streakSummary.longest_streak} 天</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {streakSummary.badges.map((badge) => (
                    <MetalBadgeCard key={badge.days} days={badge.days} earned={badge.earned} />
                  ))}
                </div>
              </CardContent>
            </Card>

        </div>
      ) : (
        <Card className="border-border/80 bg-card/85">
          <CardHeader>
            <CardTitle>需要先登入</CardTitle>
            <CardDescription>個人介面只顯示登入帳號自己的紀錄與統計資料。</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              href="/login"
            >
                <UserRound className="size-4" />
                前往登入 / 註冊
            </a>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
