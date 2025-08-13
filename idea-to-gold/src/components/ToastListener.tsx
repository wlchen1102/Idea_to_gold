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
    showIfAny();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        showIfAny();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2">
      <div className="rounded-lg bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg">
        {message}
      </div>
    </div>
  );
}


