// 多行输入框组件
"use client";
import React, { useEffect, useRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  autoResize?: boolean; // 是否启用自适应高度
  /**
   * 是否折叠组件下方的外部间距，用于抵消父级 flex gap（如 gap-3）。
   * 开启后会在根元素上加上 -mb-3，从而消除与下一个兄弟元素之间常见的 12px/0.75rem 空隙。
   * 注意：这是一个针对页面布局（常见为 gap-3）的实用优化，如果你的父级不是 gap-3，请在使用处通过 collapseGapBelow={false} 关闭。
   */
  collapseGapBelow?: boolean;
}

export default function Textarea(props: TextareaProps) {
  const {
    label,
    description,
    error,
    className = "",
    id,
    autoResize = true, // 默认开启自适应
    collapseGapBelow = true, // 默认抵消父级 gap-3
    ...rest
  } = props;

  const ref = useRef<HTMLTextAreaElement>(null);

  // 提取受控 value，确保受控场景下也会触发重算高度
  const currentValue = (rest as { value?: string | number | readonly string[] | undefined }).value;

  useEffect(() => {
    if (!autoResize || !ref.current) return;
    const el = ref.current;

    const resize = () => {
      // 记录当前光标位置，避免重算高度时出现光标跳动到开头的问题
      const isFocused = document.activeElement === el;
      const start = isFocused ? el.selectionStart : null;
      const end = isFocused ? el.selectionEnd : null;

      // 先重置高度再取 scrollHeight，避免增长后无法缩回
      el.style.height = "auto";
      // 不做最大高度裁剪，完全自适应内容
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflowY = "hidden"; // 永远隐藏纵向滚动条

      // 恢复光标位置（仅在当前元素已聚焦时）
      if (isFocused && typeof start === "number" && typeof end === "number") {
        try {
          el.setSelectionRange(start, end);
        } catch {
          // 某些浏览器/场景可能不允许设置选择范围，忽略错误
        }
      }
    };

    // 初次执行一次
    resize();

    // 输入事件时自适应
    const onInput = () => resize();
    el.addEventListener("input", onInput);

    // 监听字体/容器变化导致的重排
    const obs = new ResizeObserver(resize);
    obs.observe(el);

    return () => {
      el.removeEventListener("input", onInput);
      obs.disconnect();
    };
  }, [autoResize, currentValue]);

  // 没传 rows 时默认 1 行
  const rows = (rest as { rows?: number }).rows ?? 1;

  // 根容器类名：仅当无描述/错误信息时才折叠与下一个兄弟之间的空隙，避免影响表单注释/报错布局
  const shouldCollapse = collapseGapBelow && !description && !error;
  const rootClass = `w-full ${shouldCollapse ? "-mb-3" : ""}`.trim();

  return (
    <div className={rootClass}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[#2c3e50]">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        {...rest}
        rows={rows}
        className={
          `${label ? "mt-2 " : ""}w-full rounded-md border ${error ? "border-red-400" : "border-gray-300"} bg-white p-3 text-[14px] leading-6 focus:border-[#2ECC71] focus:outline-none resize-none overflow-hidden ` +
          (className || "")
        }
      />
      {description && <div className="mt-1 text-xs text-gray-500">{description}</div>}
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}