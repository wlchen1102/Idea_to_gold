"use client";

import Link from "next/link";
import AvatarMenu from "@/components/AvatarMenu";
import { useState } from "react";

function Header() {
  // 简单的登录态示例：后续可接入真实鉴权后更新该状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm">
              点
            </div>
            <span className="text-xl font-bold text-gray-900">点子成金</span>
          </Link>

          {/* 中间：导航 */}
          <div className="hidden gap-8 md:flex" role="navigation">
            <Link
              href="/"
              aria-current="page"
              className="text-sm font-medium text-gray-900 border-b-2 border-emerald-500 pb-1"
            >
              点子广场
            </Link>
            <Link 
              href="#" 
              className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors"
            >
              产品库
            </Link>
          </div>

          {/* 右侧：根据登录态显示不同的操作区域 */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              // 登录状态：保持原功能但使用新样式
              <>
                <Link
                  href="/creatives/new"
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
                >
                  + 发布点子
                </Link>
                <AvatarMenu />
              </>
            ) : (
              // 未登录状态：使用新的按钮样式
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  登录
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
                >
                  立即免费注册
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Header;