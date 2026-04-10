export type GoodDeedEntry = {
  id: string;
  user_id?: string | null;
  nickname: string;
  content: string;
  skip_discord_notification?: boolean;
  hide_from_global_feed?: boolean;
  date: string;
  created_at: string;
};

export type CreateGoodDeedInput = Pick<GoodDeedEntry, "nickname" | "content" | "date"> & {
  skip_discord_notification?: boolean;
  hide_from_global_feed?: boolean;
};

export type UpdateGoodDeedInput = Pick<GoodDeedEntry, "content" | "date"> & {
  hide_from_global_feed?: boolean;
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

export function getCalendarApiBaseUrl() {
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

export async function addEntry(
  input: CreateGoodDeedInput,
  options?: { cookieHeader?: string },
) {
  const response = await fetch(`${getCalendarApiBaseUrl()}/good_calendar/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.cookieHeader ? { cookie: options.cookieHeader } : {}),
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

export async function updateEntry(
  entryId: string,
  input: UpdateGoodDeedInput,
  options?: { cookieHeader?: string },
) {
  const response = await fetch(`${getCalendarApiBaseUrl()}/good_calendar/entries/${entryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(options?.cookieHeader ? { cookie: options.cookieHeader } : {}),
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  const data = (await response.json()) as {
    entry?: GoodDeedEntry;
    message?: string;
  };

  if (!response.ok || !data.entry) {
    throw new Error(data.message ?? `Failed to update entry: ${response.status}`);
  }

  return data.entry;
}

export async function deleteEntry(entryId: string, options?: { cookieHeader?: string }) {
  const response = await fetch(`${getCalendarApiBaseUrl()}/good_calendar/entries/${entryId}`, {
    method: "DELETE",
    headers: {
      ...(options?.cookieHeader ? { cookie: options.cookieHeader } : {}),
    },
    cache: "no-store",
  });

  const data = (await response.json()) as {
    deleted?: boolean;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message ?? `Failed to delete entry: ${response.status}`);
  }

  return { deleted: data.deleted === true };
}
