"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // 计算展示用字符：中文取后2位；英文取前2位（大写）；数字取后2位；否则为 U
  const getInitials = (name: string): string => {
    const input = (name || "").trim();
    if (!input) return "U";
    const chinese = Array.from(input).filter((ch) => /[\u4e00-\u9fa5]/.test(ch));
    if (chinese.length) return chinese.slice(-2).join("");
    const letters = input.replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (letters) return letters.slice(0, 2);
    const digits = input.replace(/\D/g, "");
    if (digits) return digits.slice(-2);
    return "U";
  };

  function onDocClick(e: MouseEvent) {
    if (!ref.current) return;
    if (!ref.current.contains(e.target as Node)) setOpen(false);
  }

  useEffect(() => {
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // 读取当前用户ID，并监听登录态变化；若本地没有，尝试从 Supabase 回填
  useEffect(() => {
    const readUser = async () => {
      try {
        const id = localStorage.getItem("userId");
        if (id) {
          setUserId(id);
          return id;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          localStorage.setItem("userId", user.id);
          setUserId(user.id);
          return user.id;
        }
      } catch {}
      setUserId(null);
      return null;
    };

    const fetchProfile = async (uid: string | null) => {
      if (!uid) {
        setNickname("");
        setAvatarUrl("");
        return;
      }
      try {
        // 从 profiles 读取昵称与头像
        const { data, error } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", uid)
          .single();
        if (!error && data) {
          setNickname(data.nickname || "");
          setAvatarUrl(data.avatar_url || "");
        } else {
          setNickname("");
          setAvatarUrl("");
        }
      } catch {
        setNickname("");
        setAvatarUrl("");
      }
    };

    const run = async () => {
      const uid = await readUser();
      await fetchProfile(uid);
    };

    run();

    const handler = async () => {
      const uid = await readUser();
      await fetchProfile(uid);
    };
    window.addEventListener("auth:changed", handler);
    return () => window.removeEventListener("auth:changed", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userId");
      window.dispatchEvent(new Event("auth:changed"));
      setOpen(false);
      router.push("/");
    } catch {}
  };

  const handleGoProfile: React.MouseEventHandler<HTMLAnchorElement> = async (e) => {
    e.preventDefault();
    try {
      let id = localStorage.getItem("userId");
      if (!id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          id = user.id;
          localStorage.setItem("userId", id);
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
  const showName = nickname && nickname.trim().length > 0 ? nickname.trim() : "我的账户";
  const initials = getInitials(nickname || "");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-gray-50 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={showName}
      >
        {/* 头像：优先显示头像URL，否则回退到首字母块 */}
        <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-[#95a5a6]/40 bg-[#ecf0f1] flex items-center justify-center text-sm font-semibold text-[#2c3e50]">
          {avatarUrl ? (
            // 使用原生 img，避免 Next/Image 配置复杂化
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={showName} className="h-full w-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        {/* 昵称：小屏隐藏，中等及以上屏幕展示 */}
        <span className="hidden md:block max-w-[8rem] truncate text-sm text-[#2c3e50]">{showName}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
        >
          {/* 头部：展示昵称与头像（弱化） */}
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-gray-200 bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={showName} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900">{showName}</div>
              <div className="text-xs text-gray-500">{userId ? userId.slice(0, 8) + "…" : "未登录"}</div>
            </div>
          </div>

          <div className="my-1 h-px bg-gray-100" />
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


