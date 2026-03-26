import { NextRequest, NextResponse } from "next/server";

import { getCalendarApiBaseUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${getCalendarApiBaseUrl()}/good_calendar/auth/pin`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(
      { ok: response.ok, error: data.message },
      { status: response.status },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新 PIN 失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
