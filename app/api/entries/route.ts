import { NextResponse } from "next/server";

import { addEntry, listEntries } from "@/lib/storage";

export const runtime = "nodejs";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

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
  };

  const nickname = body.nickname?.trim();
  const content = body.content?.trim();
  const date = body.date?.trim();

  if (!nickname || nickname.length > 30) {
    return NextResponse.json(
      { error: "請輸入 1 到 30 字的暱稱。" },
      { status: 400 },
    );
  }

  if (!date || !datePattern.test(date)) {
    return NextResponse.json(
      { error: "日期格式不正確，需為 YYYY-MM-DD。" },
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
    const { entry, created, notification } = await addEntry({ nickname, content, date });
    return NextResponse.json({ entry, created, notification });
  } catch (error) {
    const message = error instanceof Error ? error.message : "新增失敗，請稍後再試。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
