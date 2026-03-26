"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Check, ChevronLeft, ChevronRight, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CALENDAR_TIME_ZONE = "Asia/Taipei";

type ProfileData = {
  month: string;
  total_entries: number;
  last_entry_at: string | null;
  active_dates_this_month: string[];
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
  const selectedDateEntries = selectedDate
    ? (profileData?.month_entries ?? []).filter((entry) => entry.date === selectedDate)
    : [];

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
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <Card className="border-border/80 bg-card/85">
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

            <Card className="border-border/80">
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
