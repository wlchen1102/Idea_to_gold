"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AvatarMenu() {
  const [open, setOpen] = useState(false);
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

  const handleLogout = () => {
    try {
      // 清理本地登录态
      localStorage.removeItem('isLoggedIn');
      // 通知全局（Header）更新登录态
      window.dispatchEvent(new Event('auth:changed'));
      setOpen(false);
      // 跳转到首页
      router.push('/');
    } catch {}
  };

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
          <Link href="#" className="block rounded-md px-3 py-2 text-sm text-[#2c3e50] hover:bg-gray-100" role="menuitem">
            个人主页
          </Link>
          <Link href="/projects" className="block rounded-md px-3 py-2 text-sm text-[#2c3e50] hover:bg-gray-100" role="menuitem">
            我的项目
          </Link>
          <Link href="#" className="block rounded-md px-3 py-2 text-sm text-[#2c3e50] hover:bg-gray-100" role="menuitem">
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


