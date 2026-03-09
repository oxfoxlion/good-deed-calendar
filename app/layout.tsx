import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "好事日曆",
  description: "點一下日期，記下一件好事，並同步通知 Discord。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
      </body>
    </html>
  );
}
