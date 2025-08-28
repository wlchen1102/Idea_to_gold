// 评论区组件-顶层（集成后端拉取与发布、树形渲染、局部点赞演示）

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Textarea from "@/components/ui/Textarea";
import { requireSupabaseClient } from "@/lib/supabase";
import Modal from "@/components/Modal";

// 头像组件：优先显示图片，其次显示姓名首字母
function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={28}
        height={28}
        className="h-7 w-7 rounded-full object-cover"
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
    <div className="grid h-7 w-7 place-items-center rounded-full bg-[#ecf0f1] text-[#2c3e50] text-[12px] font-semibold">
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
  // 新增：点赞统计（由后端聚合返回）
  likes_count?: number;
  current_user_liked?: boolean;
}

// 前端树节点（带子回复）
interface CommentNode extends CommentDTO {
  replies: CommentNode[];
  // 仅前端本地 UI 状态（点赞演示用，不落库）
  likes?: number;
  liked?: boolean;
}

// 新增：将节点视图组件提升为顶层，避免因父组件重渲染导致的子树重挂载，从而避免回复框反复 autoFocus 抢占焦点
function NodeView({
  node,
  depth: _depth = 0,
  likesMap,
  replyOpen,
  replyValue,
  toggleLike,
  setReplyOpen,
  setReplyValue,
  submitComment,
  formatTime,
  currentUserId,
  onRequestDelete,
}: {
  node: CommentNode;
  depth?: number;
  likesMap: Record<string, { liked: boolean; likes: number }>;
  replyOpen: Record<string, boolean>;
  replyValue: Record<string, string>;
  toggleLike: (id: string) => void;
  setReplyOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setReplyValue: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submitComment: (content: string, parentId: string | null) => Promise<void>;
  formatTime: (iso: string) => string;
  currentUserId: string | null;
  onRequestDelete: (id: string) => void;
}) {
  const name = node.profiles?.nickname ?? "匿名用户";
  const avatar = node.profiles?.avatar_url ?? undefined;
  const liked = likesMap[node.id]?.liked ?? false;
  const likes = likesMap[node.id]?.likes ?? 0;

  // 仅在回复框由关->开时，定向聚焦到当前这条的 textarea，避免 autoFocus 全局抢焦点
  const open = replyOpen[node.id] ?? false;
  useEffect(() => {
    if (!open) return;
    // 下一帧再聚焦，确保节点已渲染
    const id = `reply-${node.id}`;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id) as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        // 将光标放到文本末尾，便于继续输入
        try {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        } catch {}
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open, node.id]);

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
          {currentUserId && currentUserId === node.author_id ? (
            <button
              onClick={() => onRequestDelete(node.id)}
              className="text-[13px] text-gray-500 hover:underline"
            >
              删除
            </button>
          ) : null}
        </div>

        {replyOpen[node.id] && (
          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 md:p-4">
            <Textarea
              id={`reply-${node.id}`}
              value={replyValue[node.id] ?? ""}
              onChange={(e) => setReplyValue((p) => ({ ...p, [node.id]: e.target.value }))}
              placeholder={`回复 ${name} ...`}
              rows={1}
              autoResize
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
              <NodeView
                key={child.id}
                node={child}
                depth={_depth + 1}
                likesMap={likesMap}
                replyOpen={replyOpen}
                replyValue={replyValue}
                toggleLike={toggleLike}
                setReplyOpen={setReplyOpen}
                setReplyValue={setReplyValue}
                submitComment={submitComment}
                formatTime={formatTime}
                currentUserId={currentUserId}
                onRequestDelete={onRequestDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export default function CommentsSection({
  ideaId,
}: {
  ideaId?: string;
}) {
  const pathname = usePathname();
  // 顶部发布框内容
  const [value, setValue] = useState("");
  // 点赞本地状态（演示用）
  const [likesMap, setLikesMap] = useState<Record<string, { liked: boolean; likes: number }>>({});
  // 回复框开关 & 内容
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyValue, setReplyValue] = useState<Record<string, string>>({});
  // 新增：当前登录用户ID（用于在自己评论旁显示“删除”按钮）
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // 新增：删除确认弹窗状态
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // 获取当前登录用户ID
    const supabase = requireSupabaseClient();
    supabase.auth
      .getSession()
      .then((res) => {
        setCurrentUserId(res.data?.session?.user?.id ?? null);
      })
      .catch(() => setCurrentUserId(null));
  }, [pathname]);

  // 原始平铺列表（来自后端）
  const [items, setItems] = useState<CommentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 拉取评论列表（按时间升序）
  useEffect(() => {
    let aborted = false;
    async function fetchComments(cid: string) {
      try {
        setLoading(true);
        setError(null);
        
        // 获取用户token用于识别当前用户的点赞状态
        const supabase = requireSupabaseClient();
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data?.session?.access_token ?? "";
        
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        const res = await fetch(`/api/comments?creative_id=${encodeURIComponent(cid)}`, {
          headers
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `加载失败（${res.status}）`);
        }
        const json = (await res.json()) as { comments?: CommentDTO[] };
        if (aborted) return;
        const list = json.comments ?? [];
        setItems(list);
        // 根据后端聚合结果初始化 likesMap
        setLikesMap((prev) => {
          const next = { ...prev } as Record<string, { liked: boolean; likes: number }>;
          for (const it of list) {
            const liked = Boolean(it.current_user_liked);
            const likes = Number((it as { likes_count?: number }).likes_count ?? 0);
            next[it.id] = { liked, likes: Math.max(0, likes) };
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
  }, [ideaId, pathname]);

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

  // 计算树结构 + 同步点赞状态
  const tree = useMemo(() => {
    const byId = new Map<string, CommentNode>();
     const roots: CommentNode[] = [];
     for (const it of items) byId.set(it.id, { ...(it as CommentDTO), replies: [] });
     for (const node of byId.values()) {
       // 从 likesMap 注入 UI 状态
       const l = likesMap[node.id];
       if (l) {
         node.likes = l.likes;
         node.liked = l.liked;
       }
       const parentId = node.parent_comment_id;
       if (parentId) {
         const parent = byId.get(parentId);
         if (parent) parent.replies.push(node);
         else roots.push(node); // 容错：父节点缺失
       } else {
         roots.push(node);
       }
     }
     const byDesc = (a: CommentNode, b: CommentNode) =>
       new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
     function sortRec(list: CommentNode[]) {
       list.sort(byDesc);
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
    const old = likesMap[id] ?? { liked: false, likes: 0 };
    const optimisticLiked = !old.liked;
    const optimisticLikes = Math.max(0, old.likes + (optimisticLiked ? 1 : -1));
    // 先做乐观更新
    setLikesMap((prev) => ({ ...prev, [id]: { liked: optimisticLiked, likes: optimisticLikes } }));

    (async () => {
      try {
        const supabase = requireSupabaseClient();
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data?.session?.access_token ?? "";
        if (!token) {
          throw new Error("请先登录");
        }
        const res = await fetch(`/api/comments/${encodeURIComponent(id)}/like`, {
          method: optimisticLiked ? "POST" : "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = (await res.json().catch(() => null)) as { likes_count?: number; message?: string; error?: string } | null;
        if (!res.ok) {
          throw new Error(j?.error || j?.message || `请求失败（${res.status}）`);
        }
        const serverCount = typeof j?.likes_count === "number" ? Number(j?.likes_count) : optimisticLikes;
        setLikesMap((prev) => ({ ...prev, [id]: { liked: optimisticLiked, likes: Math.max(0, serverCount) } }));
      } catch (err) {
        // 失败回滚
        setLikesMap((prev) => ({ ...prev, [id]: { liked: old.liked, likes: old.likes } }));
        const msg = err instanceof Error ? err.message : "操作失败";
        alert(msg);
      }
    })();
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

  // 删除评论（仅作者可删）
  async function deleteCommentById(id: string): Promise<boolean> {
    try {
      const supabase = requireSupabaseClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token ?? "";
      if (!token) {
        alert("请先登录");
        return false;
      }
      const res = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (res.status === 401) {
        alert("登录已过期，请重新登录");
        return false;
      }
      if (!res.ok) {
        throw new Error(j?.error || j?.message || `请求失败（${res.status}）`);
      }
      // 乐观移除被删节点，避免界面延迟
      setItems((prev) => prev.filter((c) => c.id !== id));
      // 清理相关本地状态
      setLikesMap((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
      setReplyOpen((prev) => {
        const { [id]: _r, ...rest } = prev;
        return rest;
      });
      setReplyValue((prev) => {
        const { [id]: _v, ...rest } = prev;
        return rest;
      });
      // 关键：重新拉取一次列表，确保若开启了级联删除，子回复也被一并移除
      if (ideaId) {
        try {
          const resp = await fetch(`/api/comments?creative_id=${encodeURIComponent(ideaId)}`);
          if (resp.ok) {
            const json = (await resp.json().catch(() => null)) as { comments?: CommentDTO[] } | null;
            const list = json?.comments ?? [];
            setItems(list);
            // 同步 likesMap（从后端聚合结果重建）
            setLikesMap((prev) => {
              const next = { ...prev } as Record<string, { liked: boolean; likes: number }>;
              for (const it of list) {
                const liked = Boolean(it.current_user_liked);
                const likes = Number((it as { likes_count?: number }).likes_count ?? 0);
                next[it.id] = { liked, likes: Math.max(0, likes) };
              }
              return next;
            });
          }
        } catch {}
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "删除失败";
      alert(msg);
      return false;
    }
  }

  // 嵌套节点渲染（已提升为顶层组件）
  // NodeView 已移到文件顶层

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
            <NodeView
              key={node.id}
              node={node}
              likesMap={likesMap}
              replyOpen={replyOpen}
              replyValue={replyValue}
              toggleLike={toggleLike}
              setReplyOpen={setReplyOpen}
              setReplyValue={setReplyValue}
              submitComment={submitComment}
              formatTime={formatTime}
              currentUserId={currentUserId}
              onRequestDelete={setConfirmDeleteId}
            />
          ))}
        </ul>
      )}

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => {
          if (!deleting) setConfirmDeleteId(null);
        }}
      >
        <p className="text-[16px] sm:text-[18px] leading-7 text-gray-800">确定删除此评论？</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmDeleteId(null)}
            disabled={deleting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#2c3e50] hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!confirmDeleteId) return;
              const id = confirmDeleteId;
              // 立即关闭弹窗，不阻塞用户
              setConfirmDeleteId(null);
              setDeleting(true);
              const ok = await deleteCommentById(id);
              setDeleting(false);
              if (ok && typeof window !== "undefined") {
                localStorage.setItem("pendingToast", "删除成功");
                window.dispatchEvent(new Event("localToast"));
              }
            }}
            className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            disabled={deleting}
          >
            确认
          </button>
        </div>
      </Modal>
    </div>
  );
}


