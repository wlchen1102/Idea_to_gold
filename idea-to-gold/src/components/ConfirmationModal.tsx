// 确认弹窗用于在用户进行敏感操作（如删除、发布）前，提示用户确认操作。

"use client";

import React from "react";
import Modal from "./Modal";

// 兼容历史调用保留类型定义，但该组件仅渲染“警告 + 两按钮”特定内容
export interface SimilarIdea {
  id?: string;
  title: string;
  score: number;
  href?: string;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  // 历史兼容：外部可能仍会传入，但在本组件内不再使用
  similar?: SimilarIdea;
  onClose?: () => void; // 返回修改
  onContinue?: () => void; // 继续发布
  // 历史兼容：外部可能仍会传入，但在本组件内不再使用
  onMerge?: () => void;
}

export default function ConfirmationModal({ isOpen, onClose, onContinue }: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose ?? (() => {})} title="确认发布">
      <p className="text-[14px] leading-6 text-gray-700">
        我们发现了一些可能与您的想法类似的创意。继续发布可能会造成内容重复，您确定要继续吗？
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-md bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white hover:bg-[#27AE60]"
        >
          继续发布
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#2c3e50] hover:bg-gray-50"
        >
          返回修改
        </button>
      </div>
    </Modal>
  );
}


