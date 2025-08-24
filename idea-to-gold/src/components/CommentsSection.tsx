// 评论区组件-顶层（集成后端拉取与发布、树形渲染、局部点赞演示）

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Textarea from "@/components/ui/Textarea";
import { requireSupabaseClient } from "@/lib/supabase";

// 头像组件：优先显示图片，其次显示姓名首字母
function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover"
        unoptimized
      />
    );
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ecf0f1] text-[#2c3e50] text-sm font-semibold">
      {initials}
    </div>
  );
}

// 后端返回的评论 DTO（与 /api/comments 对齐）
interface CommentDTO {
  id: string;
  content: string;
  author_id: string;
  creative_id: string | null;
  project_log_id: string | null;
  parent_comment_id: string | null;
  created_at: string; // ISO 字符串
  profiles?: {
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

// 前端树节点（带子回复）
interface CommentNode extends CommentDTO {
  replies: CommentNode[];
  // 仅前端本地 UI 状态（点赞演示用，不落库）
  likes?: number;
  liked?: boolean;
}

export default function CommentsSection({
  ideaId,
}: {
  ideaId?: string;
}) {
  // 顶部发布框内容
  const [value, setValue] = useState("");
  // 原始平铺列表（来自后端）
  const [items, setItems] = useState<CommentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 本地点赞 Map（演示用）
  const [likesMap, setLikesMap] = useState<Record<string, { liked: boolean; likes: number }>>({});
  // 回复框开关与内容
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyValue, setReplyValue] = useState<Record<string, string>>({});

  // 拉取评论列表（按时间升序）
  useEffect(() => {
    let aborted = false;
    async function fetchComments(cid: string) {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/comments?creative_id=${encodeURIComponent(cid)}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `加载失败（${res.status}）`);
        }
        const json = (await res.json()) as { comments?: CommentDTO[] };
        if (aborted) return;
        const list = json.comments ?? [];
        setItems(list);
        // 初始化 likesMap（仅添加缺失项）
        setLikesMap((prev) => {
          const next = { ...prev };
          for (const it of list) {
            if (!next[it.id]) next[it.id] = { liked: false, likes: 0 };
          }
          return next;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "加载异常";
        setError(msg);
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    if (ideaId) fetchComments(ideaId);
    return () => {
      aborted = true;
    };
  }, [ideaId]);

  // 从 localStorage 注入跨页内容：仅预填到输入框，不自动发表
  useEffect(() => {
    const key = `injectComment:${ideaId ?? ""}`;
    function tryConsume() {
      if (!ideaId) return;
      const content = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (content) {
        setValue(content);
        localStorage.removeItem(key);
        localStorage.setItem("pendingToast", "已将您的描述填入评论框，确认后再发布");
      }
    }
    tryConsume();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) tryConsume();
    };
    const onFocus = () => tryConsume();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [ideaId]);

  // 平铺转树（父子均按时间升序）
  const tree: CommentNode[] = useMemo(() => {
    const map = new Map<string, CommentNode>();
    const roots: CommentNode[] = [];
    for (const it of items) {
      map.set(it.id, {
        ...it,
        replies: [],
        liked: likesMap[it.id]?.liked ?? false,
        likes: likesMap[it.id]?.likes ?? 0,
      });
    }
    for (const node of map.values()) {
      if (node.parent_comment_id) {
        const parent = map.get(node.parent_comment_id);
        if (parent) parent.replies.push(node);
        else roots.push(node); // 容错：父节点缺失
      } else {
        roots.push(node);
      }
    }
    const byAsc = (a: CommentNode, b: CommentNode) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    function sortRec(list: CommentNode[]) {
      list.sort(byAsc);
      for (const n of list) sortRec(n.replies);
    }
    sortRec(roots);
    return roots;
  }, [items, likesMap]);

  function formatTime(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }

  function toggleLike(id: string) {
    setLikesMap((prev) => {
      const cur = prev[id] ?? { liked: false, likes: 0 };
      const liked = !cur.liked;
      const likes = cur.likes + (liked ? 1 : -1);
      return { ...prev, [id]: { liked, likes: Math.max(0, likes) } };
    });
  }

  async function submitComment(content: string, parentId: string | null = null) {
    if (!ideaId) return;
    const text = content.trim();
    if (!text) return;

    try {
      const supabase = requireSupabaseClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token ?? "";
      if (!token) {
        alert("请先登录后再发表评论");
        return;
      }

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text, creative_id: ideaId, parent_comment_id: parentId }),
      });
      const j = (await res.json().catch(() => null)) as { comment?: CommentDTO | null; message?: string; error?: string } | null;
      if (res.status === 401) {
        alert("登录已过期，请重新登录");
        return;
      }
      if (!res.ok) {
        throw new Error(j?.error || j?.message || `请求失败（${res.status}）`);
      }

      const created = (j?.comment ?? null) as CommentDTO | null;
      if (created) {
        setItems((prev) => [...prev, created]);
        // 初始化点赞项
        setLikesMap((prev) => ({ ...prev, [created.id]: prev[created.id] ?? { liked: false, likes: 0 } }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "发表失败";
      alert(msg);
    }
  }

  // 嵌套节点渲染
  function NodeView({ node, depth = 0 }: { node: CommentNode; depth?: number }) {
    const name = node.profiles?.nickname ?? "匿名用户";
    const avatar = node.profiles?.avatar_url ?? undefined;
    const liked = likesMap[node.id]?.liked ?? false;
    const likes = likesMap[node.id]?.likes ?? 0;

    return (
      <li key={node.id} className="flex gap-3">
        <Avatar name={name} src={avatar} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-[#2c3e50]">{name}</span>
            <span className="text-[12px] text-[#95a5a6]">{formatTime(node.created_at)}</span>
          </div>
          <p className="mt-1 text-[14px] leading-6 text-gray-700">{node.content}</p>
          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={() => toggleLike(node.id)}
              className={`inline-flex items-center gap-1 text-[13px] ${
                liked ? "text-[#e74c3c]" : "text-gray-600 hover:text-[#e74c3c]"
              }`}
              aria-label="点赞评论"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={liked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{likes}</span>
            </button>
            <button
              onClick={() => setReplyOpen((p) => ({ ...p, [node.id]: !p[node.id] }))}
              className="text-[13px] text-[#3498db] hover:underline"
            >
              回复
            </button>
          </div>

          {replyOpen[node.id] && (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 md:p-4">
              <Textarea
                value={replyValue[node.id] ?? ""}
                onChange={(e) => setReplyValue((p) => ({ ...p, [node.id]: e.target.value }))}
                placeholder={`回复 ${name} ...`}
                rows={1}
                autoResize
                autoFocus
                className="border-0 focus:border-transparent focus:ring-0 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setReplyOpen((p) => ({ ...p, [node.id]: false }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    const text = (replyValue[node.id] ?? "").trim();
                    if (!text) return;
                    await submitComment(text, node.id);
                    setReplyValue((p) => ({ ...p, [node.id]: "" }));
                    setReplyOpen((p) => ({ ...p, [node.id]: false }));
                  }}
                  className="rounded-lg bg-[#2ECC71] px-4 py-2 text-white hover:bg-[#27AE60]"
                >
                  发表回复
                </button>
              </div>
            </div>
          )}

          {node.replies.length > 0 && (
            <ul className="mt-4 space-y-4 pl-0 border-l border-gray-200">
              {node.replies.map((child) => (
                <NodeView key={child.id} node={child} depth={depth + 1} />
              ))}
            </ul>
          )}
        </div>
      </li>
    );
  }

  const totalCount = items.length;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-[#2c3e50]">评论（{totalCount > 99 ? "99+" : totalCount}）</h3>
      </div>

      {/* 顶部发布框 */}
      <div className="mt-3 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 md:p-4">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="写下你的看法..."
          rows={1}
          autoResize
          className="border-0 focus:border-transparent focus:ring-0 bg-white"
        />
        <div className="flex justify-end">
          <button
            onClick={async () => {
              const text = value.trim();
              if (!text) return;
              await submitComment(text, null);
              setValue("");
            }}
            className="rounded-lg bg-[#2ECC71] px-4 py-2 text-white hover:bg-[#27AE60]"
          >
            发表评论
          </button>
        </div>
      </div>

      {/* 列表区域 */}
      {loading ? (
        <div className="mt-5 text-sm text-gray-500">加载中...</div>
      ) : error ? (
        <div className="mt-5 text-sm text-red-600">{error}</div>
      ) : tree.length === 0 ? (
        <div className="mt-5 text-sm text-gray-500">还没有评论，快来抢沙发～</div>
      ) : (
        <ul className="mt-5 space-y-4">
          {tree.map((node) => (
            <NodeView key={node.id} node={node} />
          ))}
        </ul>
      )}
    </div>
  );
}


