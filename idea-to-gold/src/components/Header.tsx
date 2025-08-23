// 顶栏组件
"use client";

import Link from "next/link";
import AvatarMenu from "@/components/AvatarMenu";
import { useEffect, useState } from "react";
import { requireSupabaseClient } from "@/lib/supabase";
import { usePathname } from "next/navigation";

function Header() {
  // 登录态来源：Supabase 会话
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const init = async () => {
      try {
        // 确保只在浏览器环境中执行
        if (typeof window === 'undefined') return;
        
        const supabase = requireSupabaseClient();
        
        // 获取当前用户
        const { data } = await supabase.auth.getUser();
        setIsLoggedIn(!!data.user);

        // 监听会话变化
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          setIsLoggedIn(!!session?.user);
        });

        unsub = () => {
          try { listener.subscription.unsubscribe(); } catch {}
        };
      } catch (e) {
        console.warn("获取用户失败:", e);
      }
    };

    init();
    return () => { if (unsub) unsub(); };
  }, []);

  // 当前路由，用于导航高亮
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Logo 永远返回到首页（落地页）
  const homeHref = "/";

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={homeHref} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm">
              点
            </div>
            <span className="text-xl font-bold text-gray-900">点子成金</span>
          </Link>

          {/* 中间：导航 */}
          <div className="hidden gap-8 md:flex" role="navigation">
            <Link 
              href="/creatives" 
              className={`text-sm font-medium transition-colors px-1 pb-1 border-b-2 ${
                isActive('/creatives')
                  ? 'text-emerald-600 border-emerald-500'
                  : 'text-gray-700 hover:text-emerald-600 border-transparent'
              }`}
              aria-current={isActive('/creatives') ? 'page' : undefined}
            >
              创意广场
            </Link>
            <Link 
              href="#" 
              className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors px-1 pb-1 border-b-2 border-transparent"
            >
              产品库
            </Link>
          </div>

          {/* 右侧：根据登录态显示不同的操作区域 */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              // 登录状态
              <>
                {/* AvatarMenu 内部已经负责从 profiles 获取 nickname 与 avatar_url 并渲染 */}
                <AvatarMenu />
              </>
            ) : (
              // 未登录状态
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  登录
                </Link>
                <Link
                  href="/login?mode=signup"
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
export const dynamic = 'force-dynamic'