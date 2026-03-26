import { NextRequest, NextResponse } from "next/server";

import { getCalendarApiBaseUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${getCalendarApiBaseUrl()}/good_calendar/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json();
    const nextResponse = NextResponse.json(
      { user: data.user, error: data.message },
      { status: response.status },
    );
    const setCookie = response.headers.get("set-cookie");

    if (setCookie) {
      nextResponse.headers.set("set-cookie", setCookie);
    }

    return nextResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "註冊失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
