// 单行输入框组件
"use client";
import React from "react";

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  fontSize?: string; // 字体大小，如 'text-3xl', 'text-lg' 等
}

export default function TextInput({ label, description, error, className = "", fontSize = "text-[14px]", id, ...rest }: TextInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[#2c3e50]">
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        {...rest}
        className={
          `mt-2 w-full rounded-md border ${error ? "border-red-400" : "border-gray-300"} bg-transparent p-3 ${fontSize} focus:border-1 focus:border-[#2ECC71] focus:outline-none ` + (className || "")
        }
      />
      {description && <div className="mt-1 text-xs text-gray-500">{description}</div>}
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}