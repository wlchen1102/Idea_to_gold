"use client";

import { useEffect } from "react";

export default function ClientEffects({ ideaId }: { ideaId: string }) {
  useEffect(() => {
    const toast = localStorage.getItem("pendingToast");
    if (toast) {
      // 触发 ToastListener
      localStorage.setItem("pendingToast", toast);
    }

    const commentKey = `pendingComment:${ideaId}`;
    const content = localStorage.getItem(commentKey);
    if (content) {
      localStorage.setItem(`injectComment:${ideaId}`, content);
      localStorage.removeItem(commentKey);
    }
  }, [ideaId]);
  return null;
}


