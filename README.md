# Good Deed Calendar

用 Next.js 製作的好事日曆，介面已重構為 `shadcn` 風格，並支援深色與淺色模式。

## 功能

- 使用者可輸入暱稱作為日曆辨識
- 介面採用 `components/ui` 結構，方便持續擴充 `shadcn` 風格元件
- 支援深色與淺色模式切換，主題偏好會記錄在瀏覽器 localStorage
- 點擊日期即可新增當天紀錄
- 提供週檢視與月檢視，方便快速瀏覽同週與整月資料
- 新增後由 LineLanguageBot API 寫入資料庫，並透過 Discord Bot 發送通知到指定頻道

## 專案結構

- `app/page.tsx`：首頁主介面，整合月曆、週曆、最新紀錄與新增表單
- `components/ui/*`：手動整理的 `shadcn` 風格基礎元件，例如 `Button`、`Card`、`Input`、`Textarea`
- `components/theme-provider.tsx`：管理 light / dark mode
- `components/theme-toggle.tsx`：主題切換按鈕
- `app/globals.css`：全域設計 token、色票與深淺色 CSS variables

## 啟動

1. 安裝依賴：`npm install`
2. 設定環境變數：把 `.env.example` 複製成 `.env.local` 並填入 `CALENDAR_API_BASE_URL`
3. 啟動開發環境：`npm run dev`

資料會寫入 `LineLanguageBot` 的 PostgreSQL `good_calendar.entries`。

## 後端需求

- `LineLanguageBot` 需先執行 `npm run initdb`
- `LineLanguageBot` 的 `.env` 需設定 `DATABASE_URL`、`DISCORD_TOKEN`，以及好事通知用的 `DISCORD_GOOD_DEED_ID`
- 前端 `.env.local` 的 `CALENDAR_API_BASE_URL` 要指到 `LineLanguageBot` 的服務位址
