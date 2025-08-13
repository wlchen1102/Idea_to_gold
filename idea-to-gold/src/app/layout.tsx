import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "点子成金",
  description: "把你的点子打造成产品的地方",
};

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        {/* 左侧：Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2ECC71] text-white">点</span>
          <span className="text-[16px] font-semibold leading-6 text-[#2c3e50]">点子成金</span>
        </Link>

        {/* 中间：导航 */}
        <nav className="hidden gap-8 md:flex">
          <Link
            href="/"
            aria-current="page"
            className="text-[16px] leading-6 text-[#2c3e50] underline decoration-[#2ECC71] decoration-2 underline-offset-8"
          >
            创意广场
          </Link>
          <Link href="#" className="text-[16px] leading-6 text-[#2c3e50] hover:text-[#2ECC71]">
            项目
          </Link>
          <Link href="#" className="text-[16px] leading-6 text-[#2c3e50] hover:text-[#2ECC71]">
            产品
          </Link>
        </nav>

        {/* 右侧：发布按钮与头像占位 */}
        <div className="flex items-center gap-3">
          <Link
            href="#"
            className="rounded-md bg-[#2ECC71] px-4 py-2 text-white hover:brightness-95"
          >
            + 发布创意
          </Link>
          <div className="h-9 w-9 rounded-full bg-[#ecf0f1] ring-1 ring-[#95a5a6]/40" />
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} antialiased min-h-screen bg-[#f7f8fa]`}>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
