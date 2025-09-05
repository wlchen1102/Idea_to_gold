/**
 * 删除确认对话框组件（通用版，样式对齐评论删除弹窗）
 * - 使用通用 Modal 外壳，统一遮罩、圆角与关闭交互
 * - 默认仅展示一句确认文案与“取消/确认”两个按钮
 * - 兼容旧 props，但不默认展示 subject/creativeTitle
 */
'use client';

import React from 'react';
import Modal from '@/components/Modal';

export interface DeleteConfirmDialogProps {
  /** 是否显示对话框 */
  isOpen: boolean;
  /** 要删除的对象标题（新） */
  subject?: string;
  /** 兼容旧用法：要删除的创意标题（旧） */
  creativeTitle?: string;
  /** 是否正在删除中（用于禁用按钮） */
  isDeleting?: boolean;
  /** 自定义标题文案（默认：确定删除此项？） */
  title?: string;
  /** 自定义描述（不再默认展示，仅保留字段以兼容旧用法） */
  description?: string;
  /** 自定义确认按钮文案（默认：确认） */
  confirmText?: string;
  /** 自定义取消按钮文案（默认：取消） */
  cancelText?: string;
  /** 确认删除回调 */
  onConfirm: () => void | Promise<void>;
  /** 取消删除回调 */
  onCancel: () => void;
}

export default function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  const {
    isOpen,
    // subject,
    // creativeTitle,
    isDeleting = false,
    title,
    // description,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
  } = props;

  const heading = title ?? '确定删除此项？';
  const confirmLabel = '确认' in Object(props) && confirmText !== undefined ? confirmText : '确认';
  const cancelLabel = cancelText ?? '取消';

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      {/* 文案：与评论删除保持一致的字号与行高 */}
      <p className="text-[16px] sm:text-[18px] leading-7 text-gray-800">{heading}</p>

      {/* 操作按钮 */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#2c3e50] hover:bg-gray-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}