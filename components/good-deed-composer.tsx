"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const guestNicknameStorageKey = "good-deed-calendar:guest-nickname";
const quickGoodDeeds = ["做了喜歡的事情", "覺得自己很棒", "遇到讚事", "很幸運", "可愛", "愛"];
const CALENDAR_TIME_ZONE = "Asia/Taipei";
const moodScaleLabels: Record<number, string> = {
  1: "心情糟透了，但我還是試著練習找到小小的好事",
  2: "心情偏低，先從一件小好事開始。",
  3: "有點低落，但仍願意留意生活中的亮點。",
  4: "心情還在整理中，慢慢回穩。",
  5: "普通不算差也不算好",
  6: "心情還不錯，開始有一點能量。",
  7: "感覺偏好，今天有不少值得感謝的事。",
  8: "心情很好，內在狀態很順。",
  9: "非常好，充滿動力與滿足感。",
  10: "非常幸福內心感到充實",
};
const moodGuideSummary = `1：${moodScaleLabels[1]}\n5：${moodScaleLabels[5]}\n10：${moodScaleLabels[10]}`;

type Entry = {
  id: string;
  nickname: string;
  content: string;
  skip_discord_notification?: boolean;
  hide_from_global_feed?: boolean;
  mood_temperature?: number;
  date: string;
  created_at: string;
};

type EntryOptions = {
  skip_discord_notification?: boolean;
  hide_from_global_feed?: boolean;
  mood_temperature?: number;
};

type BadgeState = {
  days: number;
  earned: boolean;
};

type ProfileBadgeResponse = {
  profile?: {
    streak_summary?: {
      badges?: BadgeState[];
    };
  };
};

function getCurrentMonthKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

async function loadEarnedBadges() {
  const response = await fetch(`/api/profile?month=${getCurrentMonthKey()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as ProfileBadgeResponse;
  return (data.profile?.streak_summary?.badges ?? []).filter((badge) => badge.earned).map((badge) => badge.days);
}

type GoodDeedComposerProps = {
  latestAllowedDate: string;
  earliestAllowedDate: string;
  description?: string;
  className?: string;
  onEntryCreated?: (entry: Entry) => void;
};

export function GoodDeedComposer({
  latestAllowedDate,
  earliestAllowedDate,
  description = "填寫暱稱、選擇日期後新增當天紀錄。",
  className,
  onEntryCreated,
}: GoodDeedComposerProps) {
  const { currentUser } = useAuth();
  const [guestNickname, setGuestNickname] = useState("");
  const [goodDeed, setGoodDeed] = useState("");
  const [draftDate, setDraftDate] = useState(() => latestAllowedDate);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [moodGuideTop, setMoodGuideTop] = useState(96);
  const [moodGuideAnchor, setMoodGuideAnchor] = useState<HTMLElement | null>(null);
  const [entryOptions, setEntryOptions] = useState<EntryOptions>({
    skip_discord_notification: false,
    hide_from_global_feed: false,
    mood_temperature: 5,
  });

  const nickname = currentUser.isLoggedIn ? currentUser.nickname : guestNickname;

  useEffect(() => {
    setDraftDate(latestAllowedDate);
  }, [latestAllowedDate]);

  useEffect(() => {
    if (currentUser.isLoggedIn) {
      return;
    }

    const storedNickname = window.localStorage.getItem(guestNicknameStorageKey);
    if (storedNickname) {
      setGuestNickname(storedNickname);
    }
  }, [currentUser.isLoggedIn]);

  useEffect(() => {
    if (currentUser.isLoggedIn) {
      return;
    }

    window.localStorage.setItem(guestNicknameStorageKey, guestNickname);
  }, [currentUser.isLoggedIn, guestNickname]);

  function closeComposer() {
    setIsComposerOpen(false);
    setGoodDeed("");
    setSubmitError("");
    setEntryOptions({
      skip_discord_notification: false,
      hide_from_global_feed: false,
      mood_temperature: 5,
    });
  }

  function syncMoodGuideTop(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return;
    }
    setMoodGuideTop(target.getBoundingClientRect().bottom + 8);
    setMoodGuideAnchor(target);
  }

  useEffect(() => {
    if (!moodGuideAnchor) {
      return;
    }

    let frameId = 0;
    const sync = () => {
      setMoodGuideTop(moodGuideAnchor.getBoundingClientRect().bottom + 8);
      frameId = window.requestAnimationFrame(sync);
    };

    frameId = window.requestAnimationFrame(sync);
    return () => window.cancelAnimationFrame(frameId);
  }, [moodGuideAnchor]);

  async function createEntry() {
    const trimmedNickname = nickname.trim();
    const trimmedGoodDeed = goodDeed.trim();

    if (!trimmedNickname || !trimmedGoodDeed) {
      return;
    }

    if (draftDate < earliestAllowedDate || draftDate > latestAllowedDate) {
      setSubmitError(
        `只能新增本月或上個月，且不可超過今天（可選 ${earliestAllowedDate} 到 ${latestAllowedDate}）`,
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const earnedBadgesBefore = currentUser.isLoggedIn ? await loadEarnedBadges() : [];
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: trimmedNickname,
          content: trimmedGoodDeed,
          date: draftDate,
          ...entryOptions,
        }),
      });

      const data = (await response.json()) as {
        entry?: Entry;
        error?: string;
      };

      if (!response.ok || !data.entry) {
        setSubmitError(data.error ?? "新增失敗");
        return;
      }

      window.dispatchEvent(new CustomEvent("good-deed:entry-created"));
      if (currentUser.isLoggedIn) {
        const earnedBadgesAfter = await loadEarnedBadges();
        const newlyEarnedBadges = earnedBadgesAfter.filter((days) => !earnedBadgesBefore.includes(days));

        if (newlyEarnedBadges.length) {
          window.dispatchEvent(
            new CustomEvent("good-deed:badge-earned", {
              detail: {
                badges: newlyEarnedBadges,
              },
            }),
          );
        }
      }
      onEntryCreated?.(data.entry);
      setGoodDeed("");
      setDraftDate(data.entry.date);
      closeComposer();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Card className={cn("border-border/80 bg-card/80 shadow-none", className)}>
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>新增好事</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="h-11 w-full rounded-2xl"
            onClick={() => {
              setDraftDate(latestAllowedDate);
              setSubmitError("");
              setIsComposerOpen(true);
            }}
          >
            新增好事
          </Button>
        </CardContent>
      </Card>

      {isComposerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => {
            if (isSubmitting) {
              return;
            }

            closeComposer();
          }}
          role="presentation"
        >
          <Card
            className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden border-border/80 bg-background/95 sm:max-h-[calc(100vh-2rem)]"
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

            <CardHeader className="space-y-5 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="relative flex flex-col gap-4 pr-12 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <Badge className="rounded-full bg-primary/10 text-primary dark:bg-primary/15">
                    GOOD DEED ENTRY
                  </Badge>
                  <CardTitle className="text-2xl sm:text-3xl">{draftDate}</CardTitle>
                  <CardDescription>今天做了什麼好事。</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isSubmitting}
                  className="absolute right-0 top-0 rounded-full"
                  onClick={closeComposer}
                  aria-label="關閉新增好事視窗"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 overflow-y-auto px-4 pt-2 pb-4 sm:px-6 sm:pb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="modal-date">
                  日期
                </label>
                <Input
                  id="modal-date"
                  type="date"
                  min={earliestAllowedDate}
                  max={latestAllowedDate}
                  value={draftDate}
                  onChange={(event) => {
                    setDraftDate(event.target.value);
                    setSubmitError("");
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  只能新增本月或上個月，日期範圍為 {earliestAllowedDate} 到 {latestAllowedDate}。
                </p>
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

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">心情溫度計</p>
                  <div className="group relative">
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/80 text-muted-foreground"
                      aria-label="心情溫度說明"
                      title={moodGuideSummary}
                      onMouseEnter={(event) => syncMoodGuideTop(event.currentTarget)}
                      onMouseLeave={() => setMoodGuideAnchor(null)}
                      onFocus={(event) => syncMoodGuideTop(event.currentTarget)}
                      onBlur={() => setMoodGuideAnchor(null)}
                      onClick={(event) => syncMoodGuideTop(event.currentTarget)}
                    >
                      <Info className="size-3.5" />
                    </button>
                    <div
                      className="pointer-events-none fixed left-1/2 top-[var(--mood-guide-top)] z-20 hidden w-[min(14rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-border bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block group-focus-within:block sm:absolute sm:left-0 sm:top-7 sm:w-72 sm:translate-x-0"
                      style={{ "--mood-guide-top": `${moodGuideTop}px` } as React.CSSProperties}
                    >
                      <p>1：{moodScaleLabels[1]}</p>
                      <p>5：{moodScaleLabels[5]}</p>
                      <p>10：{moodScaleLabels[10]}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                  <div className="mx-auto w-full max-w-md px-1">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      dir="ltr"
                      value={entryOptions.mood_temperature ?? 5}
                      onChange={(event) =>
                        setEntryOptions((currentOptions) => ({
                          ...currentOptions,
                          mood_temperature: Number(event.target.value),
                        }))
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-sky-300 via-amber-200 to-rose-300 accent-white"
                      aria-label="心情溫度滑桿"
                    />
                    <div className="relative mt-2 h-4 text-xs text-muted-foreground">
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                        <span
                          key={level}
                          title={moodScaleLabels[level]}
                          aria-label={moodScaleLabels[level]}
                          className={cn(
                            "absolute top-0 -translate-x-1/2",
                            level === 1 && "left-0 translate-x-0",
                            level === 10 && "left-full -translate-x-full",
                          )}
                          style={level > 1 && level < 10 ? { left: `${((level - 1) / 9) * 100}%` } : undefined}
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>低溫</span>
                    <span>目前 {entryOptions.mood_temperature ?? 5} / 10</span>
                    <span>高溫</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickGoodDeeds.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={goodDeed === item ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setGoodDeed(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">發布選項</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={entryOptions.skip_discord_notification ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() =>
                      setEntryOptions((currentOptions) => ({
                        ...currentOptions,
                        skip_discord_notification: !currentOptions.skip_discord_notification,
                      }))
                    }
                  >
                    不要傳送到 Discord
                  </Button>
                  {currentUser.isLoggedIn ? (
                    <Button
                      type="button"
                      variant={entryOptions.hide_from_global_feed ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() =>
                        setEntryOptions((currentOptions) => ({
                          ...currentOptions,
                          hide_from_global_feed: !currentOptions.hide_from_global_feed,
                        }))
                      }
                    >
                      不要公開到全站紀錄
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end border-t border-border/70 pt-4">
                <Button className="h-11 min-w-32 rounded-2xl" disabled={isSubmitting} onClick={createEntry}>
                  {isSubmitting ? "發送中..." : "發送好事"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
