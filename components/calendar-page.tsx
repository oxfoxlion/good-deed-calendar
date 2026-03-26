"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CALENDAR_TIME_ZONE = "Asia/Taipei";

type Entry = {
  id: string;
  nickname: string;
  content: string;
  date: string;
  created_at: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const quickGoodDeeds = ["做了喜歡的事情", "覺得自己很棒", "遇到讚事", "很幸運", "可愛", "愛"];
const guestNicknameStorageKey = "good-deed-calendar:guest-nickname";

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

export function CalendarPage() {
  const calendarCardRef = useRef<HTMLDivElement | null>(null);
  const { currentUser } = useAuth();
  const [guestNickname, setGuestNickname] = useState("");
  const [goodDeed, setGoodDeed] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState(() => getTodayDateKey());
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [calendarCardHeight, setCalendarCardHeight] = useState<number | null>(null);
  const [isXlViewport, setIsXlViewport] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const { year, month } = getCalendarNowParts();
    return new Date(year, month - 1, 1);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nickname = currentUser.isLoggedIn ? currentUser.nickname : guestNickname;

  useEffect(() => {
    const storedNickname = window.localStorage.getItem(guestNicknameStorageKey);
    if (storedNickname) {
      setGuestNickname(storedNickname);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(guestNicknameStorageKey, guestNickname);
  }, [guestNickname]);

  useEffect(() => {
    async function loadEntries() {
      try {
        const response = await fetch("/api/entries", { cache: "no-store" });
        const data = (await response.json()) as {
          entries?: Entry[];
        };

        if (!response.ok) {
          setEntries([]);
          return;
        }

        setEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch {
        setEntries([]);
      }
    }

    void loadEntries();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const updateViewport = () => setIsXlViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    const node = calendarCardRef.current;
    if (!node) {
      return;
    }

    const updateHeight = () => {
      setCalendarCardHeight(node.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [entries.length, currentMonth, selectedDate]);

  const calendarDays = buildCalendarDays(currentMonth);
  const entriesByDate = entries.reduce<Record<string, Entry[]>>((accumulator, entry) => {
    accumulator[entry.date] ??= [];
    accumulator[entry.date].push(entry);
    return accumulator;
  }, {});
  const selectedEntries = selectedDate ? entriesByDate[selectedDate] ?? [] : [];

  async function createEntry(date: string) {
    const trimmedNickname = nickname.trim();
    const trimmedGoodDeed = goodDeed.trim();

    if (!trimmedNickname || !trimmedGoodDeed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: trimmedNickname,
          content: trimmedGoodDeed,
          date,
        }),
      });

      const data = (await response.json()) as {
        entry?: Entry;
      };

      if (!response.ok || !data.entry) {
        return;
      }

      setEntries((currentEntries) => {
        const exists = currentEntries.some((entry) => entry.id === data.entry?.id);
        return exists ? currentEntries : [data.entry!, ...currentEntries];
      });

      window.dispatchEvent(new CustomEvent("good-deed:entry-created"));
      setGoodDeed("");
      setSelectedDate(date);
      setDraftDate(date);
      setIsComposerOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit() {
    if (!draftDate) {
      return;
    }

    void createEntry(draftDate);
  }

  return (
    <DashboardShell
      eyebrow="GOOD DEED CALENDAR"
      title="好事日曆"
      description="把今天的好事，釘在日曆上。"
    >
      <div className="flex flex-col gap-6 xl:hidden">
        <Card className="border-border/80 bg-card/80 shadow-none">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>新增好事</CardTitle>
                <CardDescription>填寫暱稱、選擇日期後新增當天紀錄。</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="h-11 w-full rounded-2xl"
              onClick={() => {
                setDraftDate(getTodayDateKey());
                setIsComposerOpen(true);
              }}
            >
              新增好事
            </Button>
          </CardContent>
        </Card>

        <Card ref={calendarCardRef} className="border-border/80">
          <CardHeader className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardTitle>{monthLabel(currentMonth)}</CardTitle>
                <CardDescription>請點選日期查看當天的紀錄。</CardDescription>
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
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:gap-2 sm:text-xs sm:tracking-[0.24em]">
              {weekdays.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const dayEntries = entriesByDate[day.key] ?? [];

                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedDate(day.key)}
                    className={cn(
                      "min-h-16 rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent sm:min-h-24 sm:rounded-2xl sm:p-2.5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      !day.isCurrentMonth && "opacity-40",
                      day.isToday && "border-primary/50",
                      dayEntries.length > 0 && "bg-primary/10",
                      selectedDate === day.key && "border-primary ring-2 ring-primary/30",
                    )}
                  >
                    <div className="flex flex-col items-start gap-1.5">
                      <p className="text-sm font-semibold sm:text-base">{day.date.getDate()}</p>
                      {dayEntries.length > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:min-w-6 sm:px-2 sm:text-xs">
                          {dayEntries.length}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border-border/80">
          <CardHeader>
            <CardTitle>{selectedDate ? `${selectedDate} 的紀錄` : "當天紀錄"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedDate ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
                請先從日曆點選一個日期。
              </div>
            ) : selectedEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
                這一天還沒有紀錄。
              </div>
            ) : (
              selectedEntries.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className="text-sm font-semibold">{entry.nickname}</p>
                      <p className="break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                        {entry.content}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {entry.date}
                    </Badge>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden gap-6 xl:grid xl:grid-cols-[1.55fr_0.95fr] xl:items-stretch">
        <Card ref={calendarCardRef} className="border-border/80 xl:h-full">
          <CardHeader className="space-y-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle>{monthLabel(currentMonth)}</CardTitle>
                  <CardDescription>請點選日期查看當天的紀錄。</CardDescription>
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
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:gap-2 sm:text-xs sm:tracking-[0.24em] md:gap-3">
              {weekdays.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3">
              {calendarDays.map((day) => {
                const dayEntries = entriesByDate[day.key] ?? [];

                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedDate(day.key)}
                    className={cn(
                      "min-h-16 rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent sm:min-h-24 sm:rounded-2xl sm:p-2.5 md:min-h-32 md:rounded-3xl md:p-4",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      !day.isCurrentMonth && "opacity-40",
                      day.isToday && "border-primary/50",
                      dayEntries.length > 0 && "bg-primary/10",
                      selectedDate === day.key && "border-primary ring-2 ring-primary/30",
                    )}
                  >
                    <div className="flex flex-col items-start gap-1.5">
                      <p className="text-sm font-semibold sm:text-base md:text-2xl">{day.date.getDate()}</p>
                      {dayEntries.length > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:min-w-6 sm:px-2 sm:text-xs">
                          {dayEntries.length}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div
          className="flex min-h-0 w-full flex-col gap-6"
          style={isXlViewport && calendarCardHeight ? { height: `${calendarCardHeight}px` } : undefined}
        >
          <Card className="border-border/80 bg-card/80 shadow-none">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>新增好事</CardTitle>
                  <CardDescription>填寫暱稱、選擇日期後新增當天紀錄。</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="h-11 w-full rounded-2xl"
                onClick={() => {
                  setDraftDate(getTodayDateKey());
                  setIsComposerOpen(true);
                }}
              >
                新增好事
              </Button>
            </CardContent>
          </Card>

          <Card className="w-full border-border/80 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            <CardHeader>
              <CardTitle>{selectedDate ? `${selectedDate} 的紀錄` : "當天紀錄"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-3">
              {!selectedDate ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
                  請先從日曆點選一個日期。
                </div>
              ) : selectedEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
                  這一天還沒有紀錄。
                </div>
              ) : (
                selectedEntries.map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="text-sm font-semibold">{entry.nickname}</p>
                        <p className="break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                          {entry.content}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {entry.date}
                      </Badge>
                    </div>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isComposerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => {
            if (isSubmitting) {
              return;
            }

            setIsComposerOpen(false);
            setGoodDeed("");
          }}
          role="presentation"
        >
          <Card
            className="relative w-full max-w-2xl border-border/80 bg-background/95"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {isSubmitting ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-background/90">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                <p className="text-sm font-medium">正在送出好事紀錄...</p>
              </div>
            ) : null}

            <CardHeader className="space-y-5">
              <div className="relative flex flex-col gap-4 pr-12 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <Badge className="rounded-full bg-primary/10 text-primary dark:bg-primary/15">
                    GOOD DEED ENTRY
                  </Badge>
                  <CardTitle className="text-3xl">{draftDate}</CardTitle>
                  <CardDescription>今天做了什麼好事。</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isSubmitting}
                  className="absolute right-0 top-0 rounded-full"
                  onClick={() => {
                    setIsComposerOpen(false);
                    setGoodDeed("");
                  }}
                  aria-label="關閉新增好事視窗"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="modal-date">
                  日期
                </label>
                <Input
                  id="modal-date"
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="modal-nickname">
                  日曆暱稱
                </label>
                <Input
                  id="modal-nickname"
                  maxLength={10}
                  placeholder="例如：小明、企鵝隊長"
                  value={nickname}
                  readOnly={currentUser.isLoggedIn}
                  onChange={(event) => setGuestNickname(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="modal-good-deed">
                  今天做了什麼好事
                </label>
                <Textarea
                  id="modal-good-deed"
                  autoFocus
                  maxLength={280}
                  placeholder="例如：幫同事處理卡住的工作、陪家人吃飯、主動關心朋友"
                  value={goodDeed}
                  onChange={(event) => setGoodDeed(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {quickGoodDeeds.map((item) => (
                  <Button
                    key={item}
                    variant={goodDeed === item ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setGoodDeed(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>

              <div className="flex justify-end">
                <Button className="h-11 min-w-32 rounded-2xl" disabled={isSubmitting} onClick={handleSubmit}>
                  {isSubmitting ? "發送中..." : "發送好事"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </DashboardShell>
  );
}
