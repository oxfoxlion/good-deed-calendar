import { NextResponse } from "next/server";

import { addEntry, listEntries } from "@/lib/storage";

export const runtime = "nodejs";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function getCalendarTodayParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "1970"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "01"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "01"),
  };
}

function toDateKey(year: number, month: number, day = 1) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function validateEntryDate(date: string) {
  const { year, month, day } = getCalendarTodayParts();
  const latestAllowedDate = toDateKey(year, month, day);

  let previousMonthYear = year;
  let previousMonth = month - 1;
  if (previousMonth === 0) {
    previousMonth = 12;
    previousMonthYear -= 1;
  }

  const earliestAllowedDate = toDateKey(previousMonthYear, previousMonth, 1);

  return {
    isValid: date >= earliestAllowedDate && date <= latestAllowedDate,
    earliestAllowedDate,
    latestAllowedDate,
  };
}

export async function GET() {
  try {
    const entries = await listEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取失敗，請稍後再試。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    nickname?: string;
    content?: string;
    date?: string;
    skip_discord_notification?: boolean;
    hide_from_global_feed?: boolean;
  };

  const nickname = body.nickname?.trim();
  const content = body.content?.trim();
  const date = body.date?.trim();
  const skipDiscordNotification = body.skip_discord_notification === true;
  const hideFromGlobalFeed = body.hide_from_global_feed === true;

  if (nickname && nickname.length > 10) {
    return NextResponse.json(
      { error: "請輸入 1 到 10 字的暱稱。" },
      { status: 400 },
    );
  }

  if (!date || !datePattern.test(date)) {
    return NextResponse.json(
      { error: "日期格式不正確，需為 YYYY-MM-DD。" },
      { status: 400 },
    );
  }

  const dateValidation = validateEntryDate(date);
  if (!dateValidation.isValid) {
    return NextResponse.json(
      {
        error: `只能新增本月或上個月，且不可超過今天（可選 ${dateValidation.earliestAllowedDate} 到 ${dateValidation.latestAllowedDate}）。`,
      },
      { status: 400 },
    );
  }

  if (!content || content.length > 280) {
    return NextResponse.json(
      { error: "請輸入 1 到 280 字的好事內容。" },
      { status: 400 },
    );
  }

  try {
    const { entry, created, notification } = await addEntry(
      {
        nickname: nickname ?? "",
        content,
        date,
        skip_discord_notification: skipDiscordNotification,
        hide_from_global_feed: hideFromGlobalFeed,
      },
      { cookieHeader: request.headers.get("cookie") ?? "" },
    );
    return NextResponse.json({ entry, created, notification });
  } catch (error) {
    const message = error instanceof Error ? error.message : "新增失敗，請稍後再試。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
