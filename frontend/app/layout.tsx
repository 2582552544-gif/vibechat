import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vibechat.app"),
  title: {
    default: "VibeChat · 此刻被看见 — AI 情绪社交，把同频的人匹配到一起",
    template: "%s · VibeChat",
  },
  description:
    "说出此刻说不清的感受，AI 会给你一个「型」和一句也许正中你的话，再把正在经历同一件事的人匿名匹配到一起聊聊。基于情绪的匿名社交，温柔、不诊断、不留痕迹。",
  keywords: [
    "情绪社交",
    "匿名聊天",
    "AI 情绪分析",
    "同频匹配",
    "情绪可视化",
    "深夜倾诉",
    "VibeChat",
  ],
  applicationName: "VibeChat",
  authors: [{ name: "VibeChat" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "VibeChat · 此刻被看见",
    description:
      "把你此刻说不清的感受分析成一个「型」，再把正在经历同一件事的人匿名匹配到一起聊聊。",
    siteName: "VibeChat",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeChat · 此刻被看见",
    description: "AI 情绪社交 —— 说出此刻，遇见也在这样的人。",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className="antialiased">{children}</body>
    </html>
  );
}
