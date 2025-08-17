"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // 读取当前用户ID，并监听登录态变化；若本地没有，尝试从 Supabase 回填
  useEffect(() => {
    const read = async () => {
      try {
        const id = localStorage.getItem("userId");
        if (id) {
          setUserId(id);
          return;
        }
        // 兜底：尝试从 Supabase 会话获取 user
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user?.id) {
          localStorage.setItem("userId", user.id);
          setUserId(user.id);
        } else {
          setUserId(null);
        }
      } catch {
        setUserId(null);
      }
    };
    read();
    const handler = () => read();
    window.addEventListener("auth:changed", handler);
    return () => window.removeEventListener("auth:changed", handler);
  }, []);

  const handleLogout = async () => {
    try {
      // 先退出 Supabase 会话，避免残留 token
      await supabase.auth.signOut();
    } catch {}
    try {
      // 清理本地登录态
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userId');
      // 通知全局（Header）更新登录态
      window.dispatchEvent(new Event('auth:changed'));
      setOpen(false);
      // 跳转到首页
      router.push('/');
    } catch {}
  };

  const handleGoProfile: React.MouseEventHandler<HTMLAnchorElement> = async (e) => {
    e.preventDefault();
    try {
      let id = localStorage.getItem('userId');
      if (!id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          id = user.id;
          localStorage.setItem('userId', id);
          setUserId(id);
        }
      }
      setOpen(false);
      if (id) {
        router.push(`/profile/${id}`);
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  };

  const profileHref = userId ? `/profile/${userId}` : "/login";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-full bg-[#ecf0f1] ring-1 ring-[#95a5a6]/40"
        aria-haspopup="menu"
        aria-expanded={open}
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          <Link href={profileHref} onClick={handleGoProfile} className="block rounded-md px-3 py-2 text-sm text-[#2c3e50] hover:bg-gray-100" role="menuitem">
            个人中心
          </Link>
          <Link href="/projects" className="block rounded-md px-3 py-2 text-sm text-[#2c3e50] hover:bg-gray-100" role="menuitem">
            我的项目
          </Link>
          <Link href="/settings/account" className="block rounded-md px-3 py-2 text-sm text-[#2c3e50] hover:bg-gray-100" role="menuitem">
            账号设置
          </Link>
          <div className="my-1 h-px bg-gray-100" />
          <button onClick={handleLogout} className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" role="menuitem">
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}


