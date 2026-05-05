import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Link Tracker",
  description: "캠페인별 추적 링크 및 QR 코드 관리 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
