"use client";

import React, { useEffect } from "react";

export interface SimilarIdea {
  id?: string;
  title: string;
  score: number; // 0-1 之间的小数
  href?: string;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  similar?: SimilarIdea;
  onClose?: () => void;
  onMerge?: () => void; // “是的，合并进去并+1”
  onContinue?: () => void; // “我的创意是全新的，继续发布”
}

export default function ConfirmationModal({
  isOpen,
  similar,
  onClose,
  onMerge,
  onContinue,
}: ConfirmationModalProps) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    if (isOpen) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scoreText = similar ? `${Math.round((similar.score ?? 0) * 100)}%` : "";

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗主体 */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <h3 className="text-lg font-semibold text-[#2c3e50]">我们发现了一些高度相似的创意！</h3>

          {/* 相似卡片（简化版） */}
          {similar && (
            <div className="mt-4 rounded-lg border border-gray-200 p-4">
              <div className="text-[12px] text-gray-500">相似度: {scoreText}</div>
              <div className="mt-1 text-[15px] font-medium text-[#2c3e50]">{similar.title}</div>
              <a
                href={similar.href || "#"}
                className="mt-1 inline-block text-[13px] text-[#3498db] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                查看详情
              </a>
            </div>
          )}

          {/* 按钮区 */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={onMerge}
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              是的，合并进去并+1
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="rounded-md bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white hover:bg-[#27AE60]"
            >
              我的创意是全新的，继续发布
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#2c3e50] hover:bg-gray-50"
            >
              我再想想
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


