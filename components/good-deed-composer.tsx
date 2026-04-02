"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

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

type Entry = {
  id: string;
  nickname: string;
  content: string;
  skip_discord_notification?: boolean;
  hide_from_global_feed?: boolean;
  date: string;
  created_at: string;
};

type EntryOptions = {
  skip_discord_notification?: boolean;
  hide_from_global_feed?: boolean;
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
  const [entryOptions, setEntryOptions] = useState<EntryOptions>({
    skip_discord_notification: false,
    hide_from_global_feed: false,
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
    });
  }

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => {
            if (isSubmitting) {
              return;
            }

            closeComposer();
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
                  onClick={closeComposer}
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

              <div className="flex justify-end">
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
