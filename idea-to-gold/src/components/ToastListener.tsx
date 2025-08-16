"use client";

import React, { useEffect, useState } from "react";

export default function ToastListener() {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const key = "pendingToast";

    function showIfAny() {
      const msg = localStorage.getItem(key);
      if (msg) {
        setMessage(msg);
        localStorage.removeItem(key);
        setTimeout(() => setMessage(""), 2500);
      }
    }

    // 组件挂载时首次检查
    showIfAny();

    // 监听跨窗口的 storage 事件
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        showIfAny();
      }
    };

    // 监听同页面的自定义事件
    const onLocalToast = () => {
      showIfAny();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("localToast", onLocalToast);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("localToast", onLocalToast);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]">
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg">
        <span aria-hidden>🚀</span>
        <span>{message}</span>
      </div>
    </div>
  );
}


