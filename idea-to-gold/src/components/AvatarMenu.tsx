"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { requireSupabaseClient } from "@/lib/supabase";
import Image from "next/image";

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url?: string;
}

function AvatarMenu() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
        const authUser = data.user;

        if (authUser) {
          setIsLoggedIn(true);
          await fetchProfile(authUser.id);
        } else {
          setIsLoggedIn(false);
          setUser(null);
        }

        // 监听会话变化
        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            setIsLoggedIn(true);
            await fetchProfile(session.user.id);
          } else {
            setIsLoggedIn(false);
            setUser(null);
          }
        });

        unsub = () => {
          try { listener.subscription.unsubscribe(); } catch {}
        };
      } catch (e) {
        console.warn("获取用户失败:", e);
      }
    };

    const fetchProfile = async (userId: string) => {
      try {
        if (typeof window === 'undefined') return;
        
        const supabase = requireSupabaseClient();
        const { data } = await supabase
          .from("profiles")
          .select("id, nickname, avatar_url")
          .eq("id", userId)
          .single();
        
        if (data) {
          setUser(data);
        }
      } catch (error) {
        console.error("获取用户资料失败:", error);
      }
    };

    // 订阅 auth:changed 自定义事件，当登录状态变化时触发
    const handleAuthChange = async (event: Event) => {
      if (typeof window === 'undefined') return;
      
      const { userId } = (event as CustomEvent<{ userId: string | null }>).detail || {};
      if (userId) {
        const storedUserId = localStorage.getItem("userId");
        if (storedUserId) {
          await fetchProfile(storedUserId);
        }
      } else {
        setUser(null);
      }
    };

    // 初始加载
    const initializeUser = async () => {
      if (typeof window === 'undefined') return;
      
      const storedUserId = localStorage.getItem("userId");
      if (storedUserId) {
        await fetchProfile(storedUserId);
      }
    };

    initializeUser();
    init();

    // 监听事件
    if (typeof window !== 'undefined') {
      window.addEventListener("auth:changed", handleAuthChange);
    }

    return () => {
      if (unsub) unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener("auth:changed", handleAuthChange);
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      if (typeof window === 'undefined') return;
      
      // 关闭菜单
      setIsMenuOpen(false);
      
      const supabase = requireSupabaseClient();
      await supabase.auth.signOut();
      
      // 清理本地存储
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userId");
      
      // 更新本地状态
      setIsLoggedIn(false);
      setUser(null);
      
      // 触发登录状态变更
      window.dispatchEvent(
        new CustomEvent("auth:changed", {
          detail: { userId: null },
        })
      );
      
      // 跳转到首页
      window.location.href = "/";
    } catch (error) {
      console.error("登出失败:", error);
    }
  };

  // 处理菜单项点击，关闭菜单
  const handleMenuItemClick = () => {
    setIsMenuOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-3 rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-200 hover:shadow-md transition-shadow"
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.nickname || "用户头像"}
            width={32}
            height={32}
            unoptimized
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold">
            {user.nickname?.charAt(0) || "用"}
          </div>
        )}
        <span className="hidden md:block text-sm font-medium text-gray-700 pr-3">
          {user.nickname}
        </span>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white py-2 shadow-lg ring-1 ring-gray-200">
          <Link
            href="/projects"
            onClick={handleMenuItemClick}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            我的项目
          </Link>
          <Link
            href={`/profile/${user.id}`}
            onClick={handleMenuItemClick}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            个人中心
          </Link>
          <Link
            href="/settings/account"
            onClick={handleMenuItemClick}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            账户设置
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

export default AvatarMenu;


