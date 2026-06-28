import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "写作诊断工具",
  description: "贴一段文字，看看它把你带去哪。这不是导师，是镜子。",
  keywords: ["写作", "诊断", "写作工具", "写作辅助"],
  openGraph: {
    title: "写作诊断工具",
    description: "贴一段文字，看看它把你带去哪。",
    type: "website",
    locale: "zh_CN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
