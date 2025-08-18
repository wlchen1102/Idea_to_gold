"use client";
import React from "react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; // 右侧显示的文字
  description?: string; // 下方的辅助说明文字
  error?: string; // 错误提示
  wrapperClassName?: string; // 外层容器（label）可自定义样式
}

export default function Checkbox({ label, description, error, className = "", wrapperClassName = "", ...rest }: CheckboxProps) {
  return (
    <label className={("inline-flex items-center gap-2 cursor-pointer select-none " + (wrapperClassName || "")).trim()}>
      {/* 真实的 input，使用 peer 触发可视样式；sr-only 隐藏但可访问 */}
      <input
        type="checkbox"
        {...rest}
        className={("peer sr-only " + (className || "")).trim()}
      />

      {/* 可视化方块：未选中为白底灰边；选中为绿底白勾；聚焦显示绿色焦点环（仅键盘聚焦时显示） */}
      <span
        aria-hidden="true"
        className={[
          "relative inline-flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white",
          "transition-colors duration-150 ease-out",
          // 仅在键盘导航时显示焦点环，鼠标点击不显示，避免误以为仍然选中
          "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#2ECC71] peer-focus-visible:ring-offset-0",
          // 选中态：绿底 + 绿边
          "peer-checked:bg-[#2ECC71] peer-checked:border-[#2ECC71]",
          // 选中时让子级 svg 显示出来
          "peer-checked:[&>svg]:opacity-100"
        ].join(" ")}
      >
        {/* 居中显示的白色勾勾（内联 SVG） */}
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3 text-white opacity-0 transition-opacity duration-150"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 8l2.5 2.5L12 5" />
        </svg>
      </span>

      {(label || description || error) && (
        <span className="text-sm text-[#2c3e50] leading-5">
          {label && <span>{label}</span>}
          {description && <div className="text-xs text-gray-500">{description}</div>}
          {error && <div className="text-xs text-red-500">{error}</div>}
        </span>
      )}
    </label>
  );
}