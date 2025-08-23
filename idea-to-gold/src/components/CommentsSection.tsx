// 评论区组件

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Textarea from "@/components/ui/Textarea";

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      <Image src={src} alt={name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" unoptimized />
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

export interface CommentItem {
  id: string;
  author: string;
  content: string;
  time: string;
  isAuthor?: boolean;
  likes?: number;
  liked?: boolean;
}

export default function CommentsSection({
  initialComments,
  ideaId,
}: {
  initialComments: CommentItem[];
  ideaId?: string;
}) {
  const [comments, setComments] = useState(
    initialComments.map((c) => ({
      likes: 0,
      liked: false,
      ...c,
    }))
  );
  const [value, setValue] = useState("");

  function handleSubmit() {
    if (!value.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        author: "你",
        content: value.trim(),
        time: "刚刚",
        likes: 0,
        liked: false,
      },
    ]);
    setValue("");
  }

  // 跨页注入评论（来自详情页跳转时）。监听特定键并在出现时消费
  useEffect(() => {
    const key = `injectComment:${ideaId ?? ''}`;
    function tryConsume() {
      if (!ideaId) return;
      const content = localStorage.getItem(key);
      if (content) {
        setComments((prev) => [
          ...prev,
          { id: String(Date.now()), author: "你", content, time: "刚刚", likes: 0, liked: false },
        ]);
        localStorage.removeItem(key);
        localStorage.setItem("pendingToast", "已将您的描述自动添加到评论区");
      }
    }
    // 初次尝试
    tryConsume();
    // 监听 storage 事件（跨标签页也适用）
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) tryConsume();
    };
    window.addEventListener("storage", onStorage);
    // 当页面可见时再尝试一次，避免竞态
    const onFocus = () => tryConsume();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [ideaId]);

  function toggleLike(id: string) {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              liked: !c.liked,
              likes: (c.likes ?? 0) + (c.liked ? -1 : 1),
            }
          : c
      )
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-[#2c3e50]">
          评论（{comments.length > 99 ? "99+" : comments.length}）
        </h3>
      </div>
      <div className="mt-3 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 md:p-4">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="写下你的看法..."
          rows={2}
          autoResize
          className="border-0 focus:border-transparent focus:ring-0 bg-white"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-[#2ECC71] px-4 py-2 text-white hover:bg-[#27AE60]"
          >
            发表评论
          </button>
        </div>
      </div>

      <ul className="mt-5 space-y-4">
        {([...comments].reverse()).map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.author} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-[#2c3e50]">
                  {c.author}
                </span>
                {c.isAuthor && (
                  <span className="rounded-full bg-[#F1C40F]/20 px-2 py-0.5 text-[12px] text-[#8a6d00]">
                    作者
                  </span>
                )}
                <span className="text-[12px] text-[#95a5a6]">{c.time}</span>
              </div>
              <p className="mt-1 text-[14px] leading-6 text-gray-700">{c.content}</p>
              <div className="mt-2 flex items-center gap-4">
                <button
                  onClick={() => toggleLike(c.id)}
                  className={`inline-flex items-center gap-1 text-[13px] ${
                    c.liked ? "text-[#e74c3c]" : "text-gray-600 hover:text-[#e74c3c]"
                  }`}
                  aria-label="点赞评论"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={c.liked ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{c.likes ?? 0}</span>
                </button>
                <button className="text-[13px] text-[#3498db] hover:underline">回复</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


