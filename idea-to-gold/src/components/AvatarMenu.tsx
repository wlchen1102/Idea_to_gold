// 组件：AvatarMenu
// 功能：展示用户头像及其下拉菜单（个人中心、我的项目、账户设置、退出登录）。
// 交互：悬浮头像显示菜单，离开区域延迟隐藏；菜单宽度自适应内容，左右相对触发器居中，尽量减少留白。
"use client";

import { useState, useRef } from "react";
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 处理鼠标进入
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsMenuOpen(true);
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 150); // 150ms延迟，避免鼠标快速移动时闪烁
  };

  // 如果没有用户信息，不渲染组件
  if (!user) {
    return null;
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
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
        // 使用 inline-block + w-auto 让容器宽度根据内容收缩，避免右侧大留白；并将参考点改为头像圆心（约24px：左内边距8px + 头像半径16px）
        <div className="absolute left-[24px] -translate-x-1/2 mt-2 inline-block w-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200 z-50">
          <Link
            href={`/profile/${user?.id}?tab=createdIdeas`}
            onClick={handleMenuItemClick}
            onMouseEnter={() => {
              // 悬停时预加载支持的创意数据
              if (user?.id) {
                prefetchSupportedCreatives(user.id);
              }
            }}
            className="block px-6 py-1.5 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            个人中心
          </Link>
          <Link
            href="/projects"
            onClick={handleMenuItemClick}
            className="block px-6 py-1.5 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            我的项目
          </Link>
          <Link
            href="/projects/me"
            onClick={handleMenuItemClick}
            className="block px-6 py-1.5 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            账户设置
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full px-6 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

export default AvatarMenu;


