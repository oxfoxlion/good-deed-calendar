import { NextRequest, NextResponse } from "next/server";

import { getCalendarApiBaseUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    const targetUrl = new URL(`${getCalendarApiBaseUrl()}/good_calendar/auth/profile`);

    if (month) {
      targetUrl.searchParams.set("month", month);
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(
      {
        user: data.user,
        profile: data.profile,
        error: data.message,
      },
      { status: response.status },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取個人資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
