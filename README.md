# Good Deed Calendar

用 Next.js 製作的好事日曆。

## 功能

- 使用者可輸入暱稱作為日曆辨識
- 點擊日期即可新增當天紀錄
- 新增後由 LineLanguageBot API 寫入資料庫，並透過 Discord Bot 發送通知到指定頻道

## 啟動

1. 安裝依賴：`npm install`
2. 設定環境變數：把 `.env.example` 複製成 `.env.local` 並填入 `CALENDAR_API_BASE_URL`
3. 啟動開發環境：`npm run dev`

資料會寫入 `LineLanguageBot` 的 PostgreSQL `good_calendar.entries`。

## 後端需求

- `LineLanguageBot` 需先執行 `npm run initdb`
- `LineLanguageBot` 的 `.env` 需設定 `DATABASE_URL`、`DISCORD_TOKEN`，以及好事通知用的 `DISCORD_GOOD_DEED_ID`
- 前端 `.env.local` 的 `CALENDAR_API_BASE_URL` 要指到 `LineLanguageBot` 的服務位址
