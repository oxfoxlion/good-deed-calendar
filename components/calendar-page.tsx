"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { GoodDeedComposer } from "@/components/good-deed-composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CALENDAR_TIME_ZONE = "Asia/Taipei";

type Entry = {
  id: string;
  nickname: string;
  content: string;
  skip_discord_notification?: boolean;
  hide_from_global_feed?: boolean;
  date: string;
  created_at: string;
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

export function CalendarPage() {
  const calendarCardRef = useRef<HTMLDivElement | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarCardHeight, setCalendarCardHeight] = useState<number | null>(null);
  const [isXlViewport, setIsXlViewport] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const { year, month } = getCalendarNowParts();
    return new Date(year, month - 1, 1);
  });
  const latestAllowedDate = getTodayDateKey();
  const earliestAllowedDate = getEarliestAllowedDateKey();

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
  const recentEntries = entries.slice(0, 10);

  function handleEntryCreated(entry: Entry) {
    setEntries((currentEntries) => {
      const exists = currentEntries.some((currentEntry) => currentEntry.id === entry.id);
      return exists ? currentEntries : [entry, ...currentEntries];
    });
    setSelectedDate(entry.date);
  }

  return (
    <DashboardShell
      eyebrow="GOOD DEED CALENDAR"
      title="好事日曆"
      description="把今天的好事，釘在日曆上。"
    >
      <div className="flex flex-col gap-6 xl:hidden">
        <GoodDeedComposer
          earliestAllowedDate={earliestAllowedDate}
          latestAllowedDate={latestAllowedDate}
          onEntryCreated={handleEntryCreated}
        />

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
                    onClick={() => setSelectedDate(day.key)}
                    className={cn(
                      "min-h-16 rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent sm:min-h-24 sm:rounded-2xl sm:p-2.5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
            <CardTitle>{selectedDate ? `${selectedDate} 的紀錄` : "最新紀錄"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedDate ? (
              recentEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
                  目前還沒有紀錄。
                </div>
              ) : (
                recentEntries.map((entry) => (
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
              )
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
                    onClick={() => setSelectedDate(day.key)}
                    className={cn(
                      "min-h-16 rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent sm:min-h-24 sm:rounded-2xl sm:p-2.5 md:min-h-32 md:rounded-3xl md:p-4",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
          <GoodDeedComposer
            earliestAllowedDate={earliestAllowedDate}
            latestAllowedDate={latestAllowedDate}
            onEntryCreated={handleEntryCreated}
          />

          <Card className="w-full border-border/80 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            <CardHeader>
              <CardTitle>{selectedDate ? `${selectedDate} 的紀錄` : "最新紀錄"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-3">
              {!selectedDate ? (
                recentEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
                    目前還沒有紀錄。
                  </div>
                ) : (
                  recentEntries.map((entry) => (
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
                )
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
    </DashboardShell>
  );
}
