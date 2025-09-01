// 评论区组件-顶层（集成后端拉取与发布、树形渲染、局部点赞演示）

"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
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
                onClick={() => {
                  const text = (replyValue[node.id] ?? "").trim();
                  if (!text) return;
                  // 先响应：立即清空并关闭输入框，后续异步提交
                  setReplyValue((p) => ({ ...p, [node.id]: "" }));
                  setReplyOpen((p) => ({ ...p, [node.id]: false }));
                  submitComment(text, node.id);
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
  initialComments,
}: {
  ideaId?: string;
  initialComments?: CommentDTO[];
}) {
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
  }, []); // 移除pathname依赖，只在组件挂载时执行一次

  // 原始平铺列表（来自后端）
  const [items, setItems] = useState<CommentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0, hasMore: false });

  // 拉取评论列表（支持分页）
  const fetchComments = useCallback(async (cid: string, isLoadMore = false) => {
    const fetchStartTime = Date.now(); // 性能监控：API调用开始时间
    
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      
      // 获取用户token用于识别当前用户的点赞状态
      const supabase = requireSupabaseClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token ?? "";
      
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const currentOffset = isLoadMore ? pagination.offset + pagination.limit : 0;
      const url = `/api/comments?creative_id=${encodeURIComponent(cid)}&limit=${pagination.limit}&offset=${currentOffset}&include_likes=1`;
      
      const res = await fetch(url, { 
        headers,
        // 利用浏览器缓存，与后端Cache-Control头配合
        cache: 'default'
      });
      const fetchEndTime = Date.now(); // 性能监控：API调用结束时间
      const fetchDuration = fetchEndTime - fetchStartTime;
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `加载失败（${res.status}）`);
      }
      
      const json = (await res.json()) as { 
        comments?: CommentDTO[]; 
        pagination?: { limit: number; offset: number; total: number; hasMore: boolean };
        performance?: Record<string, unknown>;
      };
      
      const processStartTime = Date.now(); // 性能监控：数据处理开始时间
      
      const list = json.comments ?? [];
      const paginationInfo = json.pagination ?? { limit: 20, offset: 0, total: 0, hasMore: false };
      
      if (isLoadMore) {
        setItems(prev => [...prev, ...list]);
      } else {
        setItems(list);
      }
      
      setPagination(paginationInfo);
      
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
      
      const processEndTime = Date.now(); // 性能监控：数据处理结束时间
      const processDuration = processEndTime - processStartTime;
      const totalDuration = processEndTime - fetchStartTime;
      
      // 性能日志记录
      console.log(`[评论前端性能] 总耗时: ${totalDuration}ms, API调用: ${fetchDuration}ms, 数据处理: ${processDuration}ms, 评论数: ${list.length}`);
      if (json.performance) {
        console.log(`[评论后端性能]`, json.performance);
      }
    } catch (e) {
      const fetchEndTime = Date.now();
      const fetchDuration = fetchEndTime - fetchStartTime;
      const msg = e instanceof Error ? e.message : "加载异常";
      setError(msg);
      console.error(`获取评论异常 (耗时${fetchDuration}ms):`, e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pagination.limit, pagination.offset]);

  // 使用 ref 防止重复调用（React 严格模式会导致 useEffect 执行两次）
  const fetchedRef = React.useRef(false);
  
  useEffect(() => {
    // 如果有初始数据，直接使用，避免重复请求
    if (initialComments && Array.isArray(initialComments)) {
      setItems(initialComments);
      // 初始化点赞状态
      const initialLikesMap: Record<string, { liked: boolean; likes: number }> = {};
      initialComments.forEach(comment => {
        initialLikesMap[comment.id] = {
          liked: Boolean(comment.current_user_liked),
          likes: comment.likes_count ?? 0
        };
      });
      setLikesMap(initialLikesMap);
      return;
    }

    if (ideaId && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchComments(ideaId);
    }
  }, [ideaId, fetchComments, initialComments]);

  // 加载更多评论
  const loadMoreComments = () => {
    if (ideaId && pagination.hasMore && !loadingMore) {
      fetchComments(ideaId, true);
    }
  };

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

  // 优化的评论树构建算法：O(n)复杂度
  const tree = useMemo(() => {
    const treeStartTime = Date.now(); // 性能监控：树结构计算开始时间
    
    if (items.length === 0) {
      return [];
    }
    
    const byId = new Map<string, CommentNode>();
    const roots: CommentNode[] = [];
    const orphans: CommentNode[] = []; // 暂时找不到父节点的评论
    
    // 单次遍历：创建节点并尝试构建树结构
    for (const item of items) {
      const node: CommentNode = { ...(item as CommentDTO), replies: [] };
      
      // 从 likesMap 注入 UI 状态
      const l = likesMap[node.id];
      if (l) {
        node.likes = l.likes;
        node.liked = l.liked;
      }
      
      byId.set(node.id, node);
      
      if (node.parent_comment_id) {
        const parent = byId.get(node.parent_comment_id);
        if (parent) {
          // 父节点已存在，直接添加到父节点的replies中
          parent.replies.push(node);
        } else {
          // 父节点还未处理，暂存为孤儿节点
          orphans.push(node);
        }
      } else {
        // 顶级评论，直接添加到树根
        roots.push(node);
      }
    }
    
    // 处理孤儿节点：尝试找到它们的父节点
    for (const orphan of orphans) {
      if (orphan.parent_comment_id) {
        const parent = byId.get(orphan.parent_comment_id);
        if (parent) {
          parent.replies.push(orphan);
        } else {
          // 父评论不在当前页面，作为顶级评论处理
          roots.push(orphan);
        }
      }
    }
    
    // 递归排序：按时间倒序
    const byDesc = (a: CommentNode, b: CommentNode) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    function sortRec(list: CommentNode[]) {
      list.sort(byDesc);
      for (const n of list) sortRec(n.replies);
    }
    sortRec(roots);
    
    const treeEndTime = Date.now(); // 性能监控：树结构计算结束时间
    const treeDuration = treeEndTime - treeStartTime;
    
    // 性能日志记录
    if (treeDuration > 10) { // 只记录超过10ms的计算
      console.log(`[评论树结构计算] 优化后耗时: ${treeDuration}ms, 评论数: ${items.length}, 根节点数: ${roots.length}, 孤儿节点: ${orphans.length}`);
    }
    
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

    // 先获取登录态，未登录则不进行乐观更新
    const supabase = requireSupabaseClient();
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data?.session?.access_token ?? "";
    if (!token) {
      alert("请先登录后再发表评论");
      return;
    }

    // 乐观创建一个临时评论，立即显示到列表
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: CommentDTO = {
      id: tempId,
      content: text,
      author_id: currentUserId ?? "",
      creative_id: ideaId,
      project_log_id: null,
      parent_comment_id: parentId,
      created_at: new Date().toISOString(),
      profiles: { nickname: "我", avatar_url: null },
      likes_count: 0,
      current_user_liked: false,
    };

    // 插入临时评论与本地点赞状态
    setItems((prev) => [...prev, optimistic]);
    setLikesMap((prev) => ({ ...prev, [tempId]: { liked: false, likes: 0 } }));

    try {
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
        // 回滚临时评论
        setItems((prev) => prev.filter((c) => c.id !== tempId));
        setLikesMap((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        alert("登录已过期，请重新登录");
        return;
      }
      if (!res.ok) {
        // 回滚临时评论
        setItems((prev) => prev.filter((c) => c.id !== tempId));
        setLikesMap((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        throw new Error(j?.error || j?.message || `请求失败（${res.status}）`);
      }

      const created = (j?.comment ?? null) as CommentDTO | null;
      if (created) {
        // 用真实返回替换临时评论
        setItems((prev) => prev.map((c) => (c.id === tempId ? created : c)));
        setLikesMap((prev) => {
          const { [tempId]: _temp, ...rest } = prev;
          const likes = Number((created as { likes_count?: number }).likes_count ?? 0);
          const liked = Boolean(created.current_user_liked);
          return { ...rest, [created.id]: { liked, likes: Math.max(0, likes) } };
        });
      } else {
        // 未拿到新评论，回滚
        setItems((prev) => prev.filter((c) => c.id !== tempId));
        setLikesMap((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      }
    } catch (e) {
      // 回滚临时评论
      setItems((prev) => prev.filter((c) => c.id !== tempId));
      setLikesMap((prev) => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
      const msg = e instanceof Error ? e.message : "发表失败";
      alert(msg);
    }
  }

  // 删除评论（仅作者可删）
  async function deleteCommentById(id: string): Promise<boolean> {
    // 先在本地进行乐观移除（包含子回复）
    const prevItems = items;
    const prevLikes = likesMap;
    const prevReplyOpen = replyOpen;
    const prevReplyValue = replyValue;

    // 计算将要删除的所有ID（包含子树）
    const collectToRemove = (rootId: string, comments: CommentDTO[]): Set<string> => {
      const toRemove = new Set<string>();
      const dfs = (pid: string) => {
        toRemove.add(pid);
        for (const c of comments) {
          if (c.parent_comment_id === pid) dfs(c.id);
        }
      };
      dfs(rootId);
      return toRemove;
    };

    const toRemoveIds = collectToRemove(id, prevItems);

    const removeCommentAndReplies = (commentId: string, comments: CommentDTO[]): CommentDTO[] => {
      const toRemoveInner = collectToRemove(commentId, comments);
      return comments.filter((c) => !toRemoveInner.has(c.id));
    };

    // 本地立即移除
    setItems((prev) => removeCommentAndReplies(id, prev));
    setLikesMap((prev) => {
      const next = { ...prev };
      toRemoveIds.forEach((rid) => delete next[rid]);
      return next;
    });
    setReplyOpen((prev) => {
      const next = { ...prev };
      toRemoveIds.forEach((rid) => delete next[rid]);
      return next;
    });
    setReplyValue((prev) => {
      const next = { ...prev };
      toRemoveIds.forEach((rid) => delete next[rid]);
      return next;
    });

    try {
      const supabase = requireSupabaseClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data?.session?.access_token ?? "";
      if (!token) {
        // 回滚
        setItems(prevItems);
        setLikesMap(prevLikes);
        setReplyOpen(prevReplyOpen);
        setReplyValue(prevReplyValue);
        alert("请先登录");
        return false;
      }

      const res = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (res.status === 401) {
        // 回滚
        setItems(prevItems);
        setLikesMap(prevLikes);
        setReplyOpen(prevReplyOpen);
        setReplyValue(prevReplyValue);
        alert("登录已过期，请重新登录");
        return false;
      }
      if (!res.ok) {
        // 回滚
        setItems(prevItems);
        setLikesMap(prevLikes);
        setReplyOpen(prevReplyOpen);
        setReplyValue(prevReplyValue);
        throw new Error(j?.error || j?.message || `请求失败（${res.status}）`);
      }

      return true;
    } catch (e) {
      // 回滚
      setItems(prevItems);
      setLikesMap(prevLikes);
      setReplyOpen(prevReplyOpen);
      setReplyValue(prevReplyValue);
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
            onClick={() => {
              const text = value.trim();
              if (!text) return;
              // 先响应：立即清空输入框并发起异步提交
              setValue("");
              submitComment(text, null);
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

      {/* 加载更多按钮 */}
      {pagination.hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMoreComments}
            disabled={loadingMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? '加载中...' : '加载更多评论'}
          </button>
        </div>
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


