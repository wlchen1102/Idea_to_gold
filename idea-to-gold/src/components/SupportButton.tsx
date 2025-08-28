"use client";

import { useState, useRef, useEffect } from "react";
import { requireSupabaseClient } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

interface SupportButtonProps {
  creativeId: string;
  initialCount: number;
  initiallySupported?: boolean; // 是否已点赞
}

interface ApiResponse {
  message: string;
  upvote_count?: number;
  changed?: boolean;
  error?: string;
}

// 一个最小可用的 toast（可替换为你的全局 Toast 组件）
function toast(msg: string) {
  if (typeof window !== "undefined") {
    try {
      // 你可以在这里触发你自己的全局 Toast 机制
      // 例如：window.dispatchEvent(new CustomEvent('toast', { detail: msg }))
      // 为保证立即可用，先使用 alert 作为兜底
      window.alert(msg);
    } catch {
      // ignore
    }
  }
}

export default function SupportButton({ creativeId, initialCount, initiallySupported = false }: SupportButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [supported, setSupported] = useState<boolean>(initiallySupported);
  const [count, setCount] = useState<number>(initialCount);
  // 使用"最后一次点击生效"模型：记录期望状态与在途请求
  const desiredRef = useRef<boolean>(initiallySupported);
  const controllerRef = useRef<AbortController | null>(null);

  // 监听路由变化，重新初始化用户状态
  useEffect(() => {
    if (!creativeId) return;
    let cancelled = false;

    async function loadUserState() {
      try {
        const supabase = requireSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token || "";
        const userId = sessionData?.session?.user?.id || "";

        if (!userId) return;

        // 1) 先用本地缓存快速显示
        const cacheKey = `supported:${userId}:${creativeId}`;
        const cachedSupported = localStorage.getItem(cacheKey) === "1";
        if (cachedSupported) {
          setSupported(true);
          desiredRef.current = true;
        }

        // 2) 从服务端获取真实状态
        const resp = await fetch(`/api/creatives/${creativeId}/upvote`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!resp.ok || cancelled) return;

        const json: { upvote_count?: number; supported?: boolean } | null = await resp
          .json()
          .catch(() => null);

        if (cancelled) return;

        const realCount = json?.upvote_count ?? initialCount;
        const realSupported = Boolean(json?.supported);

        setCount(Number(realCount) || 0);
        setSupported(realSupported);
        desiredRef.current = realSupported;

        // 更新本地缓存
        if (realSupported) localStorage.setItem(cacheKey, "1");
        else localStorage.removeItem(cacheKey);

      } catch (e) {
        console.warn("SupportButton init error:", e);
      }
    }

    loadUserState();
    return () => {
      cancelled = true;
    };
  }, [creativeId, initialCount, pathname]);

  const handleClick = async () => {
    try {
      const supabase = requireSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";
      const userId = sessionData?.session?.user?.id || "";

      if (!token) {
        toast("请先登录");
        router.push("/login");
        return;
      }

      // 以“期望状态”为基准翻转
      const nextSupported = !desiredRef.current;

      // 乐观更新 + 记录期望
      setSupported(nextSupported);
      setCount((c) => (nextSupported ? c + 1 : Math.max(0, c - 1)));
      desiredRef.current = nextSupported;

      // 中止上一次在途请求
      if (controllerRef.current) {
        try { controllerRef.current.abort('superseded'); } catch { /* ignore */ }
      }
      const controller = new AbortController();
      controllerRef.current = controller;

      // 发起与期望一致的请求
      const method = nextSupported ? 'POST' : 'DELETE';
      const resp = await fetchWithTimeout(`/api/creatives/${creativeId}/upvote`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 10000,
        signal: controller.signal,
      });

      // 仅当仍为“最新请求”时处理结果
      if (controllerRef.current !== controller) return;

      if (!resp.ok) {
        if (desiredRef.current === nextSupported) {
          // 回滚
          setSupported(!nextSupported);
          setCount((c) => (!nextSupported ? c + 1 : Math.max(0, c - 1)));
          const txt = await resp.text().catch(() => "");
          console.warn("Upvote toggle failed:", txt);
          toast(nextSupported ? "点赞失败，请重试" : "取消失败，请重试");
        }
        return;
      }

      const json = (await resp.json().catch(() => null)) as ApiResponse | null;
      if (controllerRef.current !== controller) return;

      // 关键修复：若服务端返回 changed=false（无实际变更），忽略返回的 upvote_count，保留当前乐观值
      if (json && json.changed === false) {
        console.warn("Upvote API returned changed=false, keep optimistic count.", json);
      } else if (json?.upvote_count != null) {
        setCount(json.upvote_count);
      }

      // 写本地缓存（用于详情页“秒显”）
      if (userId) {
        const cacheKey = `supported:${userId}:${creativeId}`;
        if (nextSupported) localStorage.setItem(cacheKey, "1");
        else localStorage.removeItem(cacheKey);
      }
    } catch (e) {
      const isAbort = e instanceof DOMException && e.name === 'AbortError';
      if (isAbort) return; // 被新点击取代

      // 其它错误：按当前“期望状态”回滚到相反值
      const wanted = desiredRef.current;
      setSupported(!wanted);
      setCount((c) => (wanted ? Math.max(0, c - 1) : c + 1));
      console.error(e);
      toast("操作失败，请稍后重试");
    }
  };

  const btnText = supported ? "✓ 已支持" : "我也要";
  const btnClass = supported
    ? "bg-gray-400 hover:bg-gray-400 cursor-pointer"
    : "bg-green-500 hover:bg-green-600";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        className={`px-4 py-2 rounded-md text-white transition-colors ${btnClass}`}
        aria-pressed={supported}
        aria-label="支持这个创意"
        title={btnText}
      >
        {btnText}
      </button>
      <span className="text-gray-700 text-sm select-none">{count}</span>
    </div>
  );
}