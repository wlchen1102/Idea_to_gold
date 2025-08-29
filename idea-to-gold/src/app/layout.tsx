import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastListener from "@/components/ToastListener";
import Header from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";

// Next.js 要求字体加载函数在模块顶层调用并赋值给常量
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "点子成金",
  description: "把你的点子打造成产品的地方",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning className={`${inter.className} antialiased min-h-screen bg-[#f7f8fa]`}>
        <AuthProvider>
          <ToastListener />
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
