/**
 * 删除确认对话框组件
 * 用于确认删除创意操作，防止误删
 */
import React from 'react';

export interface DeleteConfirmDialogProps {
  /** 是否显示对话框 */
  isOpen: boolean;
  /** 要删除的创意标题 */
  creativeTitle: string;
  /** 是否正在删除中 */
  isDeleting?: boolean;
  /** 确认删除回调 */
  onConfirm: () => void;
  /** 取消删除回调 */
  onCancel: () => void;
}

export default function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  const {
    isOpen,
    creativeTitle,
    isDeleting = false,
    onConfirm,
    onCancel,
  } = props;

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        {/* 对话框内容 */}
        <div 
          className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              确认删除创意
            </h3>
          </div>

          {/* 内容 */}
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              您确定要删除以下创意吗？此操作无法撤销。
            </p>
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-red-400">
              <p className="font-medium text-gray-900 truncate">
                {creativeTitle}
              </p>
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {isDeleting && (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isDeleting ? '删除中...' : '确认删除'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}