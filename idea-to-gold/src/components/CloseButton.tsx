"use client";

import type React from "react";

type CloseButtonProps = {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
};

export default function CloseButton({
  onClick,
  ariaLabel = "关闭",
  className = "",
  size = "md",
}: CloseButtonProps): React.ReactElement {
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`inline-grid place-items-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2ECC71] ${sizeClass} ${className}`}
      title={ariaLabel}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}


