"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import TextInput from "@/components/ui/TextInput";
import Textarea from "@/components/ui/Textarea";
import Checkbox from "@/components/ui/Checkbox";
import { requireSupabaseClient } from "@/lib/supabase";

// 与“发布新创意”页面保持一致的期望终端选项
const platformOptions = [
  { id: "web", label: "网页" },
  { id: "mini", label: "小程序" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "安卓" },
  { id: "win", label: "Windows" },
  { id: "mac", label: "Mac" },
] as const;

// 创意编辑按钮与弹窗表单（仅作者可见）
interface IdeaEditorProps {
  id: string;
  initialTitle: string;
  initialDescription: string;
  authorId: string;
  // 新增：期望终端初始值（例如：["web","ios"]）
  initialTerminals?: string[];
}

export default function IdeaEditor({ id, initialTitle, initialDescription, authorId, initialTerminals }: IdeaEditorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState<string>(initialTitle);
  const [description, setDescription] = useState<string>(initialDescription);
  // 新增：期望终端多选状态（key 为 id）
  const [targets, setTargets] = useState<Record<string, boolean>>({
    web: false,
    mini: false,
    ios: false,
    android: false,
    win: false,
    mac: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);

  // 仅作者可见：客户端判定当前登录用户是否为作者
  useEffect(() => {
    let unsub: (() => void) | undefined;
    const init = async () => {
      try {
        // 仅在浏览器环境执行
        if (typeof window === "undefined") return;
        const supabase = requireSupabaseClient();

        const [{ data: userData }, { data: sessionData }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession(),
        ]);

        setIsAuthor(!!userData.user && userData.user.id === authorId);
        setToken(sessionData.session?.access_token ?? null);

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          setIsAuthor(session?.user?.id === authorId);
          setToken(session?.access_token ?? null);
        });

        unsub = () => {
          try { listener.subscription.unsubscribe(); } catch {}
        };
      } catch (_e) {
        // 忽略错误，仅隐藏编辑按钮
        setIsAuthor(false);
        setToken(null);
      }
    };

    void init();
    return () => { if (unsub) unsub(); };
  }, [authorId]);

  const canSubmit = useMemo(() => {
    return !loading && title.trim().length > 0 && description.trim().length > 0;
  }, [loading, title, description]);

  const handleOpen = () => {
    setTitle(initialTitle);
    setDescription(initialDescription);
    // 基于传入的初始 terminals 恢复选择状态
    const set = new Set((initialTerminals ?? []).map((t) => String(t)));
    setTargets({
      web: set.has("web"),
      mini: set.has("mini"),
      ios: set.has("ios"),
      android: set.has("android"),
      win: set.has("win"),
      mac: set.has("mac"),
    });
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!loading) setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!token) {
      setError("当前未登录或会话已过期，请先登录");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // 组装 terminals 数组
      const terminals = Object.keys(targets).filter((k) => targets[k]);
      const res = await fetch(`/api/creatives/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), terminals }),
      });

      const json: { message?: string; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.message || json?.error || "保存失败，请稍后重试");
        return;
      }

      setIsOpen(false);
      // 刷新页面数据
      router.refresh();
    } catch (_e) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthor) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="ml-auto inline-flex items-center rounded-lg border border-emerald-500 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
      >
        编辑
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="编辑创意">
        <div className="space-y-4">
          <TextInput
            id="edit-title"
            label="标题"
            placeholder="请输入创意标题"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            maxLength={120}
            required
          />
          <Textarea
            id="edit-description"
            label="详细描述"
            placeholder="请输入创意详情"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            rows={6}
            autoResize
            maxLines={18}
            required
          />
          {/* 新增：期望终端 */}
          <div>
            <span className="block text-sm font-medium text-[#2c3e50]">期望终端</span>
            <div className="mt-3 flex flex-wrap gap-3">
              {platformOptions.map((opt) => (
                <Checkbox
                  key={opt.id}
                  id={`edit-${opt.id}`}
                  label={opt.label}
                  wrapperClassName="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  checked={Boolean(targets[opt.id])}
                  onChange={(e) =>
                    setTargets((prev) => ({ ...prev, [opt.id]: (e.target as HTMLInputElement).checked }))
                  }
                />
              ))}
            </div>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit}
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}