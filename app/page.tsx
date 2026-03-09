"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  nickname: string;
  content: string;
  date: string;
  created_at: string;
};

type ApiState = {
  type: "idle" | "success" | "error";
  message: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const quickGoodDeeds = [
  "做了喜歡的事情",
  "覺得自己很棒",
  "遇到讚事",
  "很幸運",
  "可愛",
  "愛",
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function weekLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildCalendarDays(currentMonth: Date) {
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
      isToday: toDateKey(date) === toDateKey(new Date()),
    };
  });
}

function buildWeekDays(anchorDate: Date) {
  const weekday = (anchorDate.getDay() + 6) % 7;
  const startDate = new Date(anchorDate);
  startDate.setDate(anchorDate.getDate() - weekday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      isToday: toDateKey(date) === toDateKey(new Date()),
    };
  });
}

export default function HomePage() {
  const [nickname, setNickname] = useState("");
  const [goodDeed, setGoodDeed] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekAnchorDate, setWeekAnchorDate] = useState(() => new Date());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [status, setStatus] = useState<ApiState>({
    type: "idle",
    message: "先輸入暱稱，再點日期開啟小表單，填寫好事內容後送出。",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedNickname = window.localStorage.getItem("good-deed-calendar:nickname");
    if (storedNickname) {
      setNickname(storedNickname);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("good-deed-calendar:nickname", nickname);
  }, [nickname]);

  useEffect(() => {
    async function loadEntries() {
      try {
        const response = await fetch("/api/entries", { cache: "no-store" });
        const data = (await response.json()) as {
          entries?: Entry[];
          error?: string;
        };

        if (!response.ok) {
          setEntries([]);
          setStatus({
            type: "error",
            message: data.error ?? "讀取好事日曆失敗，請稍後再試。",
          });
          return;
        }

        setEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch {
        setEntries([]);
        setStatus({
          type: "error",
          message: "讀取好事日曆失敗，請稍後再試。",
        });
      }
    }

    void loadEntries();
  }, []);

  const calendarDays = buildCalendarDays(currentMonth);
  const weekDays = buildWeekDays(selectedDate ? parseDateKey(selectedDate) : weekAnchorDate);

  const entriesByDate = entries.reduce<Record<string, Entry[]>>((accumulator, entry) => {
    accumulator[entry.date] ??= [];
    accumulator[entry.date].push(entry);
    return accumulator;
  }, {});

  async function createEntry(date: string) {
    const trimmedNickname = nickname.trim();
    const trimmedGoodDeed = goodDeed.trim();
    if (!trimmedNickname) {
      setStatus({
        type: "error",
        message: "請先輸入暱稱，系統才知道這筆日曆屬於誰。",
      });
      return;
    }

    if (!trimmedGoodDeed) {
      setStatus({
        type: "error",
        message: "請先輸入你今天做了什麼好事，再點日期。",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: trimmedNickname,
          content: trimmedGoodDeed,
          date,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        created?: boolean;
        entry?: Entry;
        notification?: {
          sent: boolean;
          reason?: string;
        };
      };

      if (!response.ok || !data.entry) {
        setStatus({
          type: "error",
          message: data.error ?? "新增失敗，請稍後再試。",
        });
        return;
      }

      setEntries((currentEntries) => {
        const safeEntries = Array.isArray(currentEntries) ? currentEntries : [];
        const exists = safeEntries.some((entry) => entry.id === data.entry?.id);
        return exists ? safeEntries : [data.entry!, ...safeEntries];
      });

      setGoodDeed("");
      setSelectedDate(null);

      setStatus({
        type: "success",
        message: data.notification?.sent
          ? `${trimmedNickname} 的 ${date} 已新增，Discord 通知已送出。`
          : `${trimmedNickname} 的 ${date} 已新增，但 Discord Bot 設定缺少資料或送出失敗。`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit() {
    if (!selectedDate) {
      setStatus({
        type: "error",
        message: "請先從日曆選一個日期。",
      });
      return;
    }

    void createEntry(selectedDate);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy hero-single">
          <p className="eyebrow">GOOD DEED CALENDAR</p>
          <h1>把今天的好事，釘在日曆上。</h1>
          <p className="hero-text">請點選要新增好事的日期。</p>
          <p className={`status status-${status.type}`}>{status.message}</p>
        </div>
      </section>

      <section className="calendar-panel">
        <div className="calendar-toolbar">
          <button
            className="month-button"
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
              )
            }
            type="button"
          >
            Prev
          </button>
          <h2>{monthLabel(currentMonth)}</h2>
          <button
            className="month-button"
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
              )
            }
            type="button"
          >
            Next
          </button>
        </div>

        <div className="week-toolbar">
          <button
            className="month-button"
            disabled={isSubmitting}
            onClick={() => {
              const next = new Date(weekAnchorDate);
              next.setDate(next.getDate() - 7);
              setWeekAnchorDate(next);
            }}
            type="button"
          >
            Prev Week
          </button>
          <h2>
            {weekLabel(weekDays[0].date)} - {weekLabel(weekDays[6].date)}
          </h2>
          <button
            className="month-button"
            disabled={isSubmitting}
            onClick={() => {
              const next = new Date(weekAnchorDate);
              next.setDate(next.getDate() + 7);
              setWeekAnchorDate(next);
            }}
            type="button"
          >
            Next Week
          </button>
        </div>

        <div className="weekdays">
          {weekdays.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="week-grid">
          {weekDays.map((day) => {
            const dayEntries = entriesByDate[day.key] ?? [];

            return (
              <button
                key={day.key}
                className={[
                  "day-card",
                  "week-card",
                  day.isToday ? "today" : "",
                  dayEntries.length > 0 ? "has-entry" : "",
                  selectedDate === day.key ? "is-selected" : "",
                ].join(" ")}
                disabled={isSubmitting}
                onClick={() => {
                  setSelectedDate(day.key);
                  setWeekAnchorDate(day.date);
                  setStatus({
                    type: "idle",
                    message: `已選擇 ${day.key}，請在小表單輸入今天的好事。`,
                  });
                }}
                type="button"
              >
                <span className="day-number">{day.date.getDate()}</span>
                <span className="day-meta">{dayEntries.length} 件好事</span>
                <div className="avatar-row">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <span key={entry.id} className="avatar-chip" title={entry.nickname}>
                      {entry.nickname.slice(0, 2)}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((day) => {
            const dayEntries = entriesByDate[day.key] ?? [];

            return (
              <button
                key={day.key}
                className={[
                  "day-card",
                  day.isCurrentMonth ? "current-month" : "other-month",
                  day.isToday ? "today" : "",
                  dayEntries.length > 0 ? "has-entry" : "",
                  selectedDate === day.key ? "is-selected" : "",
                ].join(" ")}
                disabled={isSubmitting}
                onClick={() => {
                  setSelectedDate(day.key);
                  setWeekAnchorDate(day.date);
                  setStatus({
                    type: "idle",
                    message: `已選擇 ${day.key}，請在小表單輸入今天的好事。`,
                  });
                }}
                type="button"
              >
                <span className="day-number">{day.date.getDate()}</span>
                <span className="day-meta">{dayEntries.length} 件好事</span>
                <div className="avatar-row">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <span key={entry.id} className="avatar-chip" title={entry.nickname}>
                      {entry.nickname.slice(0, 2)}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="feed-panel">
        <div className="feed-header">
          <h3>最新紀錄</h3>
          <span>{entries.length} total</span>
        </div>

        <div className="feed-list">
          {entries.length === 0 ? (
            <p className="empty-state">還沒有紀錄，先點第一個日期。</p>
          ) : (
            entries.slice(0, 10).map((entry) => (
              <article key={entry.id} className="feed-item">
                <div className="feed-copy">
                  <strong>{entry.nickname}</strong>
                  <p>{entry.content}</p>
                </div>
                <span>{entry.date}</span>
              </article>
            ))
          )}
        </div>
      </section>

      {selectedDate ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (isSubmitting) return;
            setSelectedDate(null);
            setGoodDeed("");
          }}
          role="presentation"
        >
          <section
            aria-modal="true"
            className="deed-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            {isSubmitting ? (
              <div className="modal-processing" role="status" aria-live="polite">
                <span className="spinner" />
                <p>正在送出好事紀錄...</p>
              </div>
            ) : null}

            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">GOOD DEED ENTRY</p>
                <h3>{selectedDate}</h3>
              </div>
              <button
                className="modal-close"
                disabled={isSubmitting}
                onClick={() => {
                  setSelectedDate(null);
                  setGoodDeed("");
                }}
                type="button"
              >
                Close
              </button>
            </div>

            <label className="field-label" htmlFor="modal-nickname">
              日曆暱稱
            </label>
            <input
              id="modal-nickname"
              className="nickname-input"
              maxLength={30}
              placeholder="例如：小明、企鵝隊長"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />

            <label className="field-label" htmlFor="modal-good-deed">
              今天做了什麼好事
            </label>
            <textarea
              id="modal-good-deed"
              autoFocus
              className="good-deed-input"
              maxLength={280}
              placeholder="例如：幫同事處理卡住的工作、陪家人吃飯、主動關心朋友"
              value={goodDeed}
              onChange={(event) => setGoodDeed(event.target.value)}
            />
            <div className="quick-deed-list">
              {quickGoodDeeds.map((item) => (
                <button
                  key={item}
                  className={`quick-deed-chip ${goodDeed === item ? "is-active" : ""}`}
                  onClick={() => setGoodDeed(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="submit-row">
              <div className="selected-date-card">
                <span className="selected-date-label">發送者</span>
                <strong>{nickname.trim() || "尚未填寫暱稱"}</strong>
              </div>
              <button
                className="submit-button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                type="button"
              >
                {isSubmitting ? (
                  <span className="submit-button-content">
                    <span className="spinner spinner-inline" />
                    發送中...
                  </span>
                ) : (
                  "發送好事"
                )}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
