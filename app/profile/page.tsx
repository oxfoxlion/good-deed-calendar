"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flame, Pencil, Save, Trash2, UserRound, X } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { GoodDeedComposer } from "@/components/good-deed-composer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CALENDAR_TIME_ZONE = "Asia/Taipei";
const STREAK_BADGE_DAYS = [7, 14, 28, 50, 100];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

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
    hide_from_global_feed?: boolean;
    created_at: string;
  }>;
  recent_entries: Array<{
    id: string;
    date: string;
    content: string;
    hide_from_global_feed?: boolean;
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
  const tooltipText = earned
    ? `${days} 天徽章已領取`
    : `累積到連續 ${days} 天即可解鎖`;

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={tooltipText}
        className="relative mx-auto block w-full max-w-[13rem] transition hover:-translate-y-1 focus-visible:-translate-y-1"
      >
        <div className="relative aspect-square overflow-hidden rounded-[2rem]">
          <Image
            src={`/badges/streak-${days}.png`}
            alt={`${days} 天連續徽章`}
            fill
            sizes="(max-width: 640px) 160px, (max-width: 1280px) 200px, 220px"
            className={cn(
              "object-contain transition duration-300",
              earned ? "" : "grayscale brightness-[0.85] contrast-[0.9]",
            )}
          />
          {!earned ? (
            <div className="absolute inset-0 bg-slate-950/28 backdrop-grayscale-[0.65]" />
          ) : null}
        </div>
      </button>

      <div className="pointer-events-none absolute inset-x-2 -top-20 z-10 rounded-2xl border border-slate-200/80 bg-white/96 px-4 py-3 text-left text-sm leading-6 text-slate-700 opacity-0 shadow-xl transition duration-200 group-hover:-translate-y-1 group-hover:opacity-100 group-focus-within:-translate-y-1 group-focus-within:opacity-100 dark:border-white/10 dark:bg-slate-900/96 dark:text-slate-100">
        {tooltipText}
      </div>
    </div>
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
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editHideFromGlobalFeed, setEditHideFromGlobalFeed] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingEntryId, setIsDeletingEntryId] = useState<string | null>(null);
  const [entryActionError, setEntryActionError] = useState<string | null>(null);
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

  const loadProfile = useCallback(async () => {
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
  }, [monthKey]);

  useEffect(() => {
    if (!currentUser.isLoggedIn) {
      setProfileData(null);
      setSelectedDate(null);
      return;
    }

    void loadProfile();
  }, [currentUser.isLoggedIn, loadProfile]);

  useEffect(() => {
    setSelectedDate(null);
    setEditingEntryId(null);
    setEntryActionError(null);
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
  }, [currentUser.isLoggedIn, loadProfile]);

  function startEditingEntry(entry: ProfileData["recent_entries"][number]) {
    setEditingEntryId(entry.id);
    setEditContent(entry.content);
    setEditDate(entry.date);
    setEditHideFromGlobalFeed(entry.hide_from_global_feed === true);
    setEntryActionError(null);
  }

  function cancelEditingEntry() {
    setEditingEntryId(null);
    setEditContent("");
    setEditDate("");
    setEditHideFromGlobalFeed(false);
    setEntryActionError(null);
  }

  async function handleSaveEntry() {
    const normalizedContent = editContent.trim();
    const normalizedDate = editDate.trim();

    if (!editingEntryId) {
      return;
    }

    if (!normalizedContent || normalizedContent.length > 280) {
      setEntryActionError("請輸入 1 到 280 字的好事內容。");
      return;
    }

    if (!normalizedDate || !datePattern.test(normalizedDate)) {
      setEntryActionError("日期格式不正確，需為 YYYY-MM-DD。");
      return;
    }

    if (normalizedDate < earliestAllowedDate || normalizedDate > latestAllowedDate) {
      setEntryActionError(
        `只能新增本月或上個月，且不可超過今天（可選 ${earliestAllowedDate} 到 ${latestAllowedDate}）。`,
      );
      return;
    }

    setIsSavingEdit(true);
    setEntryActionError(null);

    try {
      const response = await fetch("/api/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingEntryId,
          content: normalizedContent,
          date: normalizedDate,
          hide_from_global_feed: editHideFromGlobalFeed,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setEntryActionError(data.error ?? "編輯失敗，請稍後再試。");
        return;
      }

      if (selectedDate) {
        setSelectedDate(normalizedDate);
      }
      cancelEditingEntry();
      await loadProfile();
    } catch {
      setEntryActionError("編輯失敗，請稍後再試。");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    const confirmed = window.confirm("確定要刪除這筆好事紀錄嗎？");
    if (!confirmed) {
      return;
    }

    setIsDeletingEntryId(entryId);
    setEntryActionError(null);

    try {
      const response = await fetch("/api/entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: entryId }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setEntryActionError(data.error ?? "刪除失敗，請稍後再試。");
        return;
      }

      if (editingEntryId === entryId) {
        cancelEditingEntry();
      }

      await loadProfile();
    } catch {
      setEntryActionError("刪除失敗，請稍後再試。");
    } finally {
      setIsDeletingEntryId(null);
    }
  }

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
                {entryActionError ? (
                  <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {entryActionError}
                  </div>
                ) : null}
                {isProfileLoading ? (
                  <div className="rounded-3xl border border-dashed bg-secondary/35 p-4 text-sm text-muted-foreground">
                    正在讀取個人紀錄...
                  </div>
                ) : selectedDate ? (
                  selectedDateEntries.length ? (
                    selectedDateEntries.map((entry) => (
                      <article key={entry.id} className="rounded-3xl border bg-background/75 p-4">
                        {editingEntryId === entry.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editContent}
                              onChange={(event) => setEditContent(event.target.value)}
                              className="min-h-24"
                              maxLength={280}
                            />
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                              <input
                                type="date"
                                value={editDate}
                                min={earliestAllowedDate}
                                max={latestAllowedDate}
                                onChange={(event) => setEditDate(event.target.value)}
                                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                              />
                              <Button
                                type="button"
                                variant={editHideFromGlobalFeed ? "default" : "outline"}
                                onClick={() => setEditHideFromGlobalFeed((value) => !value)}
                                className="w-full sm:w-auto"
                              >
                                {editHideFromGlobalFeed ? "不公開" : "公開"}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleSaveEntry()}
                                disabled={isSavingEdit}
                              >
                                <Save className="size-4" />
                                儲存
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={cancelEditingEntry}
                                disabled={isSavingEdit}
                              >
                                <X className="size-4" />
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                                {entry.content}
                              </p>
                              <span className="shrink-0 text-sm text-muted-foreground">{entry.date}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs",
                                  entry.hide_from_global_feed
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                                )}
                              >
                                {entry.hide_from_global_feed ? "不公開" : "公開"}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingEntry(entry)}
                              >
                                <Pencil className="size-4" />
                                編輯
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => void handleDeleteEntry(entry.id)}
                                disabled={isDeletingEntryId === entry.id}
                              >
                                <Trash2 className="size-4" />
                                刪除
                              </Button>
                            </div>
                          </div>
                        )}
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
                      {editingEntryId === entry.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editContent}
                            onChange={(event) => setEditContent(event.target.value)}
                            className="min-h-24"
                            maxLength={280}
                          />
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <input
                              type="date"
                              value={editDate}
                              min={earliestAllowedDate}
                              max={latestAllowedDate}
                              onChange={(event) => setEditDate(event.target.value)}
                              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                            />
                            <Button
                              type="button"
                              variant={editHideFromGlobalFeed ? "default" : "outline"}
                              onClick={() => setEditHideFromGlobalFeed((value) => !value)}
                              className="w-full sm:w-auto"
                            >
                              {editHideFromGlobalFeed ? "不公開" : "公開"}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleSaveEntry()}
                              disabled={isSavingEdit}
                            >
                              <Save className="size-4" />
                              儲存
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingEntry}
                              disabled={isSavingEdit}
                            >
                              <X className="size-4" />
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                              {entry.content}
                            </p>
                            <span className="shrink-0 text-sm text-muted-foreground">{entry.date}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs",
                                entry.hide_from_global_feed
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                              )}
                            >
                              {entry.hide_from_global_feed ? "不公開" : "公開"}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingEntry(entry)}
                            >
                              <Pencil className="size-4" />
                              編輯
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleDeleteEntry(entry.id)}
                              disabled={isDeletingEntryId === entry.id}
                            >
                              <Trash2 className="size-4" />
                              刪除
                            </Button>
                          </div>
                        </div>
                      )}
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
