# Good Deed Calendar

用 Next.js 製作的好事日曆，介面已重構為 `shadcn` 風格，並支援深色與淺色模式。

## 功能

- 使用者可輸入暱稱作為日曆辨識
- 介面採用 `components/ui` 結構，方便持續擴充 `shadcn` 風格元件
- 支援深色與淺色模式切換，使用 `next-themes` 管理主題與 localStorage 偏好
- 點擊日期即可新增當天紀錄
- 提供週檢視與月檢視，方便快速瀏覽同週與整月資料
- 新增後由 LineLanguageBot API 寫入資料庫，並透過 Discord Bot 發送通知到指定頻道

## 專案結構

- `app/page.tsx`：首頁主介面，整合月曆、週曆、最新紀錄與新增表單
- `components/ui/*`：依 `shadcn` 慣例整理的基礎元件，例如 `Button`、`Card`、`Input`、`Textarea`
- `components/theme-provider.tsx`：包裝 `next-themes` 的 ThemeProvider
- `components/theme-toggle.tsx`：使用 `lucide-react` 的主題切換按鈕
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

## 實作計畫：側邊欄、個人頁與暱稱登入

以下先落地為第一版規劃，目標是把目前的「單頁＋只靠暱稱發文」升級成「有側邊欄、有個人頁、同時支援訪客輸入與帳號登入」的結構。

### 1. 產品方向

- 前端改成 dashboard 版型，左側固定側邊欄，右側為主內容區。
- 側邊欄最上方顯示目前登入者資訊，例如：
  - `目前使用者`
  - `暱稱`
  - `登入狀態 / 登出按鈕`
- 第一個頁面為「好事日曆」：
  - 保留目前月曆、週檢視、最新紀錄、新增好事功能
  - 內容以全站共用 layout 包住，而不是直接寫死在首頁
- 第二個頁面為「個人介面」：
  - 顯示個人的暱稱、註冊時間、最近新增的好事
  - 後續可擴充個人統計、密碼更新、偏好設定

### 2. 前端頁面拆分

- 建議新增共用版型：
  - `app/(dashboard)/layout.tsx`
  - `components/app-sidebar.tsx`
  - `components/app-header.tsx` 或把標題區直接整合進 layout
- 建議頁面路由：
  - `app/(dashboard)/page.tsx` 或 `app/(dashboard)/calendar/page.tsx`：好事日曆
  - `app/(dashboard)/profile/page.tsx`：個人介面
  - `app/login/page.tsx`：登入 / 首次設定 6 位數密碼
- 側邊欄選單至少包含：
  - `好事日曆`
  - `個人介面`

### 3. 後端是否需要新增使用者資料表

建議要，而且不要只靠 `entries.nickname` 當使用者識別。

原因：

- 現在 `good_calendar.entries` 只有 `nickname` 字串，這代表：
  - 同暱稱無法可靠辨識是不是同一個人
  - 之後無法安全做登入、修改密碼、個人頁統計
  - 若使用者改暱稱，舊資料會很難正確串接
- `linebot.chat_users` 比較像 Line 平台使用者資料，未必適合直接當好事日曆登入主檔
- 因此建議在 `LineLanguageBot` 內新增 `good_calendar.users`，讓好事日曆有自己的帳號模型
- 但同時保留「未登入也能新增」的訪客模式

### 4. 建議資料表設計

建議新增 `good_calendar.users`：

- `id UUID PRIMARY KEY`
- `nickname TEXT NOT NULL`
- `nickname_normalized TEXT NOT NULL`
- `password_hash TEXT`
- `password_pin_last4` 或不存明碼，只存 hash
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `last_login_at TIMESTAMPTZ`

建議唯一限制：

- `UNIQUE (nickname_normalized)`

建議調整 `good_calendar.entries`：

- 新增 `user_id UUID REFERENCES good_calendar.users(id)`，允許 `NULL`
- 保留 `nickname` 欄位，作為訪客輸入與顯示快照
- 已登入資料可同時寫入 `user_id` 與 `nickname`
- 未登入資料只寫 `nickname`，`user_id = NULL`

如果要做登入 session，建議再加：

- `good_calendar.sessions`
  - `id UUID PRIMARY KEY`
  - `user_id UUID NOT NULL`
  - `token_hash TEXT NOT NULL`
  - `expires_at TIMESTAMPTZ NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 5. 舊資料保留與 migration 策略

你提到「要保留原本的資料」，這裡建議先保留既有 `entries`，但不要把舊暱稱自動視為可登入帳號，也不要做認領。

建議 migration 流程：

1. 在 `LineLanguageBot` 新增 `good_calendar.users` 與 `good_calendar.sessions`。
2. 在 `good_calendar.entries` 新增可為 `NULL` 的 `user_id`。
3. 既有歷史資料維持原狀，不自動回填到任何帳號。
4. 新註冊使用者從註冊完成後開始累積自己的登入資料。
5. 舊資料繼續以 `nickname` 顯示，但不屬於任何帳號。

這樣可以保留既有紀錄，同時避免把舊暱稱誤綁到錯的人。

### 6. 6 位數密碼策略

可以做，但建議把它定義成「6 位數 PIN」，不要叫一般密碼。

原因：

- 6 位數只適合做低摩擦登入，不適合高安全等級帳號
- 需要明確限制格式為 `000000-999999`
- 必須只存 `hash`，不能存明碼
- 登入 API 要加上錯誤次數限制，避免暴力猜測

建議規則：

- 首次登入流程：
  - 使用者註冊新帳號
  - 設定 `暱稱 + 6 位數 PIN`
- 一般登入流程：
  - 輸入 `暱稱 + 6 位數 PIN`
  - 後端驗證後建立 session cookie
- 密碼儲存：
  - 使用 `bcrypt` 或現有專案一致的 hash 方案
  - 不存明碼，不存可逆資料

### 7. 訪客模式規則

- 未登入使用者可以輸入暱稱後直接新增一筆好事
- 訪客資料只能當成單筆匿名輸入，不建立帳號關聯
- 訪客資料不可認領、不可歸戶、不可補綁到後續註冊帳號
- 若要擁有個人頁、登入態與個人統計，必須從註冊後開始累積
- 同一個暱稱可能同時出現在：
  - 訪客輸入資料
  - 已登入帳號資料
  - 兩者在資料模型上視為不同來源，不自動合併

### 8. API 規劃

建議新增 `LineLanguageBot` API：

- `POST /good_calendar/auth/register`
  - 建立新帳號
- `POST /good_calendar/auth/login`
  - 以暱稱 + PIN 登入
- `POST /good_calendar/auth/logout`
- `GET /good_calendar/me`
  - 取得目前登入者
- `GET /good_calendar/profile`
  - 取得個人頁資料

既有 API 建議調整：

- `POST /good_calendar/entries`
  - 若已登入，從 session 取得 `user_id`
  - 若未登入，允許只傳 `nickname`
  - `nickname` 仍保留在 entry 內，作為顯示快照
- `GET /good_calendar/entries`
  - 可先維持全站列表
  - 後續可加 `mine=true` 只看自己的紀錄

### 9. 前端登入狀態規劃

- 移除目前只存在 localStorage 的 `nickname` 作法，因為它不是登入
- 改成：
  - 頁面初始化先打 `/good_calendar/me`
  - 有 session 時顯示登入者資訊
  - 無 session 時仍可進入日曆頁，但只以訪客模式操作
- 側邊欄最上方顯示：
  - 已登入：暱稱與登入狀態
  - 未登入：`訪客模式`
  - 簡短狀態文字，例如 `今天也來記一件好事`
- `個人介面` 頁面：
  - 未登入時顯示登入 / 註冊引導
  - 已登入時顯示個人資料

### 10. UI 實作順序

建議切成四個階段，避免一次改太大：

1. 先做 dashboard layout 與左側邊欄，先用假資料顯示使用者名稱。
2. 再拆出 `好事日曆` 與 `個人介面` 兩個頁面。
3. 接著在 `LineLanguageBot` 新增 `users` / `sessions` / `entries.user_id`。
4. 最後串登入、session、個人頁資料，並保留訪客新增流程。

### 11. 風險與決策點

- 若只用暱稱 + 6 位數 PIN，必須接受安全性有限
- 若暱稱要拿來登入，建議在帳號系統中設為唯一
- 因為訪客資料不可認領，所以同名暱稱的訪客資料與帳號資料會並存
- 個人頁與個人統計只應該統計 `user_id` 屬於該帳號的資料，不包含匿名訪客資料

目前較務實的第一版假設是：

- 歷史資料維持匿名，不回填帳號
- 帳號暱稱在新系統中改為唯一
- 使用者以 `暱稱 + 6 位數 PIN` 登入
- 未登入資料永不認領、永不歸戶

### 12. 建議的第一個實作里程碑

第一個 milestone 建議先做到：

- 前端有 dashboard 側邊欄
- 側邊欄顯示目前使用者名稱或訪客模式
- 有 `好事日曆` / `個人介面` 兩個頁面
- 先以前端假登入狀態或 mock user / guest 跑通 UI
- README 補上後端 migration 與登入改造規劃

等這個 milestone 穩定，再進資料表與登入流程，風險最低。
