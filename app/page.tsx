"use client";

import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  nickname: string;
  content: string;
  date: string;
  created_at: string;
};

type ApiState = {
  type: "idle" | "success" | "error";
  message: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const quickGoodDeeds = ["做了喜歡的事情", "覺得自己很棒", "遇到讚事", "很幸運", "可愛", "愛"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function weekLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
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
      isToday: toDateKey(date) === toDateKey(new Date()),
    };
  });
}

function buildWeekDays(anchorDate: Date) {
  const weekday = (anchorDate.getDay() + 6) % 7;
  const startDate = new Date(anchorDate);
  startDate.setDate(anchorDate.getDate() - weekday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      isToday: toDateKey(date) === toDateKey(new Date()),
    };
  });
}

function StatusBanner({ status }: { status: ApiState }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        status.type === "success" &&
          "border-emerald-300/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300",
        status.type === "error" &&
          "border-rose-300/70 bg-rose-500/10 text-rose-700 dark:border-rose-700 dark:text-rose-300",
        status.type === "idle" &&
          "border-border bg-secondary/70 text-muted-foreground",
      )}
    >
      {status.message}
    </div>
  );
}

export default function HomePage() {
  const [nickname, setNickname] = useState("");
  const [goodDeed, setGoodDeed] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekAnchorDate, setWeekAnchorDate] = useState(() => new Date());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [status, setStatus] = useState<ApiState>({
    type: "idle",
    message: "先輸入暱稱，再點日期開啟表單，填寫好事後送出。",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedNickname = window.localStorage.getItem("good-deed-calendar:nickname");
    if (storedNickname) {
      setNickname(storedNickname);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("good-deed-calendar:nickname", nickname);
  }, [nickname]);

  useEffect(() => {
    async function loadEntries() {
      try {
        const response = await fetch("/api/entries", { cache: "no-store" });
        const data = (await response.json()) as {
          entries?: Entry[];
          error?: string;
        };

        if (!response.ok) {
          setEntries([]);
          setStatus({
            type: "error",
            message: data.error ?? "讀取好事日曆失敗，請稍後再試。",
          });
          return;
        }

        setEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch {
        setEntries([]);
        setStatus({
          type: "error",
          message: "讀取好事日曆失敗，請稍後再試。",
        });
      }
    }

    void loadEntries();
  }, []);

  const calendarDays = buildCalendarDays(currentMonth);
  const weekDays = buildWeekDays(selectedDate ? parseDateKey(selectedDate) : weekAnchorDate);

  const entriesByDate = entries.reduce<Record<string, Entry[]>>((accumulator, entry) => {
    accumulator[entry.date] ??= [];
    accumulator[entry.date].push(entry);
    return accumulator;
  }, {});

  async function createEntry(date: string) {
    const trimmedNickname = nickname.trim();
    const trimmedGoodDeed = goodDeed.trim();

    if (!trimmedNickname) {
      setStatus({
        type: "error",
        message: "請先輸入暱稱，系統才知道這筆日曆屬於誰。",
      });
      return;
    }

    if (!trimmedGoodDeed) {
      setStatus({
        type: "error",
        message: "請先輸入你今天做了什麼好事，再點日期。",
      });
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
        error?: string;
        created?: boolean;
        entry?: Entry;
        notification?: {
          sent: boolean;
          reason?: string;
        };
      };

      if (!response.ok || !data.entry) {
        setStatus({
          type: "error",
          message: data.error ?? "新增失敗，請稍後再試。",
        });
        return;
      }

      setEntries((currentEntries) => {
        const safeEntries = Array.isArray(currentEntries) ? currentEntries : [];
        const exists = safeEntries.some((entry) => entry.id === data.entry?.id);
        return exists ? safeEntries : [data.entry!, ...safeEntries];
      });

      setGoodDeed("");
      setSelectedDate(null);
      setStatus({
        type: "success",
        message: data.notification?.sent
          ? `${trimmedNickname} 的 ${date} 已新增，Discord 通知已送出。`
          : `${trimmedNickname} 的 ${date} 已新增，但 Discord Bot 設定缺少資料或送出失敗。`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit() {
    if (!selectedDate) {
      setStatus({
        type: "error",
        message: "請先從日曆選一個日期。",
      });
      return;
    }

    void createEntry(selectedDate);
  }

  function handleDateSelect(dateKey: string, date: Date) {
    setSelectedDate(dateKey);
    setWeekAnchorDate(date);
    setStatus({
      type: "idle",
      message: `已選擇 ${dateKey}，請在表單輸入今天的好事。`,
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.16),transparent_28%),radial-gradient(circle_at_right,rgba(59,130,246,0.12),transparent_24%)]" />
      <div className="container mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
        <Card className="overflow-hidden border-border/80 bg-card/80">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1.35fr_0.9fr] md:p-8">
            <div className="space-y-5">
              <div className="space-y-3">
                <Badge className="rounded-full bg-primary/10 text-primary dark:bg-primary/15">
                  GOOD DEED CALENDAR
                </Badge>
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
                    用更乾淨的日曆版面，把今天的好事釘住。
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                    介面改成 `shadcn` 風格元件，加入深色與淺色模式，保留原本的好事輸入、週檢視與最新紀錄。
                  </p>
                </div>
              </div>
              <StatusBanner status={status} />
            </div>

            <Card className="border-border/60 bg-background/70 shadow-none">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle>個人設定</CardTitle>
                    <CardDescription>暱稱會保存在本機，重新整理後仍會保留。</CardDescription>
                  </div>
                  <ThemeToggle />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="nickname">
                    日曆暱稱
                  </label>
                  <Input
                    id="nickname"
                    maxLength={30}
                    placeholder="例如：小明、企鵝隊長"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                  />
                </div>
                <div className="rounded-2xl border border-dashed border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
                  選擇日期後會在下方跳出輸入表單，送出後同步寫入後端並發送 Discord 通知。
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <Card className="border-border/80">
            <CardHeader className="space-y-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle>{monthLabel(currentMonth)}</CardTitle>
                  <CardDescription>月檢視可以快速看到每一天累積的好事數量。</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
                      )
                    }
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 rounded-3xl border border-border bg-secondary/40 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">週檢視</p>
                    <p className="text-sm text-muted-foreground">
                      {weekLabel(weekDays[0].date)} - {weekLabel(weekDays[6].date)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => {
                        const next = new Date(weekAnchorDate);
                        next.setDate(next.getDate() - 7);
                        setWeekAnchorDate(next);
                      }}
                    >
                      Prev Week
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => {
                        const next = new Date(weekAnchorDate);
                        next.setDate(next.getDate() + 7);
                        setWeekAnchorDate(next);
                      }}
                    >
                      Next Week
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 md:gap-3">
                  {weekDays.map((day) => {
                    const dayEntries = entriesByDate[day.key] ?? [];

                    return (
                      <button
                        key={day.key}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleDateSelect(day.key, day.date)}
                        className={cn(
                          "rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                          day.isToday && "border-primary/50 bg-primary/5",
                          dayEntries.length > 0 && "border-primary/20 bg-primary/10",
                          selectedDate === day.key && "border-primary ring-2 ring-primary/30",
                        )}
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {weekdays[(day.date.getDay() + 6) % 7]}
                        </p>
                        <p className="mt-2 text-xl font-semibold">{day.date.getDate()}</p>
                        <p className="mt-4 text-xs text-muted-foreground">{dayEntries.length} 件好事</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {dayEntries.slice(0, 3).map((entry) => (
                            <Badge
                              key={entry.id}
                              className="h-7 min-w-7 justify-center rounded-full bg-primary text-primary-foreground"
                              title={entry.nickname}
                            >
                              {entry.nickname.slice(0, 2)}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.24em] text-muted-foreground md:gap-3">
                {weekdays.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {calendarDays.map((day) => {
                  const dayEntries = entriesByDate[day.key] ?? [];

                  return (
                    <button
                      key={day.key}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDateSelect(day.key, day.date)}
                      className={cn(
                        "min-h-28 rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent md:min-h-32 md:p-4",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                        !day.isCurrentMonth && "opacity-40",
                        day.isToday && "border-primary/50",
                        dayEntries.length > 0 && "bg-primary/10",
                        selectedDate === day.key && "border-primary ring-2 ring-primary/30",
                      )}
                    >
                      <p className="text-lg font-semibold md:text-2xl">{day.date.getDate()}</p>
                      <p className="mt-5 text-xs text-muted-foreground">{dayEntries.length} 件好事</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <Badge
                            key={entry.id}
                            className="h-7 min-w-7 justify-center rounded-full bg-primary text-primary-foreground"
                            title={entry.nickname}
                          >
                            {entry.nickname.slice(0, 2)}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle>最新紀錄</CardTitle>
                <CardDescription>最近 10 筆好事會顯示在這裡。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {entries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
                    還沒有紀錄，先點第一個日期。
                  </div>
                ) : (
                  entries.slice(0, 10).map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-border bg-background/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">{entry.nickname}</p>
                          <p className="text-sm leading-6 text-muted-foreground">{entry.content}</p>
                        </div>
                        <Badge>{entry.date}</Badge>
                      </div>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
              <CardHeader>
                <CardTitle>資料摘要</CardTitle>
                <CardDescription>用目前的日曆資料快速確認狀態。</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">總筆數</p>
                  <p className="mt-2 text-3xl font-semibold">{entries.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">已選日期</p>
                  <p className="mt-2 text-lg font-semibold">{selectedDate ?? "尚未選擇"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {selectedDate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => {
            if (isSubmitting) return;
            setSelectedDate(null);
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
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <Badge className="rounded-full bg-primary/10 text-primary dark:bg-primary/15">
                    GOOD DEED ENTRY
                  </Badge>
                  <CardTitle className="text-3xl">{selectedDate}</CardTitle>
                  <CardDescription>輸入今天發生的好事，送出後會同步更新日曆。</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSelectedDate(null);
                    setGoodDeed("");
                  }}
                >
                  Close
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="modal-nickname">
                  日曆暱稱
                </label>
                <Input
                  id="modal-nickname"
                  maxLength={30}
                  placeholder="例如：小明、企鵝隊長"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
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

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="rounded-2xl border border-border bg-secondary/50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">發送者</p>
                  <p className="mt-1 text-sm font-semibold">{nickname.trim() || "尚未填寫暱稱"}</p>
                </div>
                <Button className="h-11 min-w-32 rounded-2xl" disabled={isSubmitting} onClick={handleSubmit}>
                  {isSubmitting ? "發送中..." : "發送好事"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
