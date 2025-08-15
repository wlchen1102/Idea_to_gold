"use client";

import React, { useEffect } from "react";
import CloseButton from "./CloseButton";

// 通用弹窗组件：仅提供外壳与基础交互行为
export type ModalProps = {
  // 是否打开
  isOpen: boolean;
  // 关闭回调：遮罩点击、右上角关闭按钮、ESC
  onClose: () => void;
  // 可选标题
  title?: string;
  // 弹窗内容插槽
  children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // 监听 ESC 关闭
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 半透明遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗主体容器：居中布局 */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label={title || "模态弹窗"}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题与关闭按钮 */}
          <div className="flex items-start">
            {title ? (
              <h3 className="text-lg font-semibold text-[#2c3e50]">{title}</h3>
            ) : null}
            <CloseButton className="ml-auto -mr-2 -mt-2" onClick={onClose} />
          </div>

          {/* 内容区域 */}
          <div className={title ? "mt-4" : ""}>{children}</div>
        </div>
      </div>
    </div>
  );
}


