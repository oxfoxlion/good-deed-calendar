import { NextRequest, NextResponse } from "next/server";

import { getCalendarApiBaseUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";

    if (!cookieHeader.includes("good_calendar_session=")) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const response = await fetch(`${getCalendarApiBaseUrl()}/good_calendar/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取登入狀態失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
