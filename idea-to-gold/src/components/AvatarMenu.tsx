"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { requireSupabaseClient } from "@/lib/supabase";

// 预加载缓存，避免重复请求
const prefetchCache = new Set<string>();

// 预加载支持的创意数据
const prefetchSupportedCreatives = async (userId: string) => {
  const cacheKey = `supported-creatives:${userId}`;
  
  // 如果已经预加载过，跳过
  if (prefetchCache.has(cacheKey)) {
    return;
  }
  
  try {
    prefetchCache.add(cacheKey);
    
    // 获取用户token
    const supabase = requireSupabaseClient();
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data?.session?.access_token ?? "";
    
    if (!token) {
      prefetchCache.delete(cacheKey);
      return;
    }
    
    // 预加载支持的创意数据（只加载第一页）
    const url = `/api/users/${userId}/supported-creatives?page=1&limit=10`;
    
    fetch(url, { 
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'default' // 利用浏览器缓存
    }).catch(() => {
      // 预加载失败不影响用户体验，静默处理
      prefetchCache.delete(cacheKey);
    });
  } catch {
    // 预加载失败，从缓存中移除以便下次重试
    prefetchCache.delete(cacheKey);
  }
};

function AvatarMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      // 关闭菜单
      setIsMenuOpen(false);
      
      // 使用全局认证状态的登出方法
      await logout();
      
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

  // 如果没有用户信息，不渲染组件
  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 shadow-sm ring-1 ring-gray-200 hover:shadow-md transition-shadow"
      >
            {user.avatar_url ? (
              <Image 
                src={user.avatar_url} 
                alt="用户头像" 
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                {user.nickname?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">
              {user.nickname || '用户'}
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
            href={`/profile/${user?.id}`}
            onClick={handleMenuItemClick}
            onMouseEnter={() => {
              // 悬停时预加载支持的创意数据
              if (user?.id) {
                prefetchSupportedCreatives(user.id);
              }
            }}
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


