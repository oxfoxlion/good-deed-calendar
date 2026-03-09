export type GoodDeedEntry = {
  id: string;
  nickname: string;
  content: string;
  date: string;
  created_at: string;
};

type NotificationResult = {
  sent: boolean;
  reason?: string;
};

type CreateEntryResult = {
  entry: GoodDeedEntry;
  created: boolean;
  notification: NotificationResult;
};

function getCalendarApiBaseUrl() {
  const baseUrl = process.env.CALENDAR_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing CALENDAR_API_BASE_URL");
  }
  return baseUrl.replace(/\/+$/, "");
}

export async function listEntries() {
  const response = await fetch(`${getCalendarApiBaseUrl()}/good_calendar/entries`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load entries: ${response.status}`);
  }

  const data = (await response.json()) as { entries?: GoodDeedEntry[] };
  return Array.isArray(data.entries) ? data.entries : [];
}

export async function addEntry(input: Pick<GoodDeedEntry, "nickname" | "content" | "date">) {
  const response = await fetch(`${getCalendarApiBaseUrl()}/good_calendar/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  const data = (await response.json()) as {
    entry?: GoodDeedEntry;
    created?: boolean;
    notification?: NotificationResult;
    message?: string;
  };

  if (!response.ok || !data.entry) {
    throw new Error(data.message ?? `Failed to create entry: ${response.status}`);
  }

  return {
    entry: data.entry,
    created: Boolean(data.created),
    notification: data.notification ?? { sent: false, reason: "unknown" },
  } satisfies CreateEntryResult;
}
