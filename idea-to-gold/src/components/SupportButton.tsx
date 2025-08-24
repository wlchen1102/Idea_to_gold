"use client";

import { useState } from "react";
import { requireSupabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
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
  const [supported, setSupported] = useState<boolean>(initiallySupported);
  const [count, setCount] = useState<number>(initialCount);
  const [pending, setPending] = useState<boolean>(false);

  const handleClick = async () => {
    if (pending) return;

    try {
      const supabase = requireSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";

      if (!token) {
        toast("请先登录");
        router.push("/login");
        return;
      }

      setPending(true);

      if (!supported) {
        // 情况B - 乐观更新：点赞
        setSupported(true);
        setCount((c) => c + 1);

        const resp = await fetchWithTimeout(`/api/creatives/${creativeId}/upvote`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          timeoutMs: 10000,
        });

        if (!resp.ok) {
          // 回滚
          setSupported(false);
          setCount((c) => Math.max(0, c - 1));
          const txt = (await resp.text().catch(() => "")) || "操作失败，请稍后重试";
          toast("操作失败，请稍后重试");
          console.warn("Upvote failed:", txt);
          return;
        }

        // 成功：什么也不用做（UI 已经更新）
        const _json = (await resp.json().catch(() => null)) as ApiResponse | null;
        if (_json?.upvote_count != null) {
          // 同步一次真实计数（可选）
          setCount(_json.upvote_count);
        }
      } else {
        // 已点赞 -> 取消点赞（同样采用乐观更新）
        setSupported(false);
        setCount((c) => Math.max(0, c - 1));

        const resp = await fetchWithTimeout(`/api/creatives/${creativeId}/upvote`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          timeoutMs: 10000,
        });

        if (!resp.ok) {
          // 回滚
          setSupported(true);
          setCount((c) => c + 1);
          const txt = (await resp.text().catch(() => "")) || "操作失败，请稍后重试";
          toast("操作失败，请稍后重试");
          console.warn("Remove upvote failed:", txt);
          return;
        }

        const _json = (await resp.json().catch(() => null)) as ApiResponse | null;
        if (_json?.upvote_count != null) {
          setCount(_json.upvote_count);
        }
      }
    } catch (e) {
      // 极端错误回滚
      if (!supported) {
        setSupported(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        setSupported(true);
        setCount((c) => c + 1);
      }
      console.error(e);
      toast("操作失败，请稍后重试");
    } finally {
      setPending(false);
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
        disabled={pending}
        className={`px-4 py-2 rounded-md text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${btnClass}`}
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