// 多行输入框组件
"use client";
import React, { useEffect, useRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  autoResize?: boolean; // 是否启用自适应高度
  maxLines?: number; // 自适应高度时的最大行数
}

export default function Textarea({ label, description, error, className = "", id, autoResize = false, maxLines = 16, ...rest }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoResize || !ref.current) return;
    const el = ref.current;
    const verticalPadding = 24; // 对齐页面 p-3 的上下 12px
    const lineHeight = 24; // 与 leading-6 对齐
    const maxHeight = maxLines * lineHeight + verticalPadding;
    const resize = () => {
      el.style.height = "auto";
      const newHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${newHeight}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoResize, maxLines]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[#2c3e50]">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        {...rest}
        className={
          `mt-2 w-full rounded-md border ${error ? "border-red-400" : "border-gray-300"} bg-white p-3 text-[14px] leading-6 focus:border-1 focus:border-[#2ECC71] focus:outline-none resize-none ` + (className || "")
        }
      />
      {description && <div className="mt-1 text-xs text-gray-500">{description}</div>}
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}