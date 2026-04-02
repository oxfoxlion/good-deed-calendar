import { NextRequest, NextResponse } from "next/server";

import { getCalendarApiBaseUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get("redirect_to") || "/profile";
  const targetUrl = new URL(`${getCalendarApiBaseUrl()}/good_calendar/auth/google/start`);
  targetUrl.searchParams.set("redirect_to", redirectTo);
  targetUrl.searchParams.set("frontend_origin", request.nextUrl.origin);

  return NextResponse.redirect(targetUrl.toString());
}
