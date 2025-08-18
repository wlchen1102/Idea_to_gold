// 单行输入框组件
"use client";
import React from "react";

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export default function TextInput({ label, description, error, className = "", id, ...rest }: TextInputProps) {
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
          `mt-2 w-full rounded-md border ${error ? "border-red-400" : "border-gray-300"} bg-white p-3 text-[14px] focus:border-1 focus:border-[#2ECC71] focus:outline-none ` + (className || "")
        }
      />
      {description && <div className="mt-1 text-xs text-gray-500">{description}</div>}
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}