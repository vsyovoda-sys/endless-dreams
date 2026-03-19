import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "无尽之梦 — Endless Dreams",
  description: "梦境在此相遇、渗透、变形。一种通过无意识连接人的方式。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "无尽之梦",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${notoSerif.variable} h-full antialiased dark`}>
      <body className="min-h-dvh flex flex-col bg-slate-950 text-slate-100 font-serif selection:bg-indigo-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
