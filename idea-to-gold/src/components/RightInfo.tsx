"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function RightInfo({
  supporters,
  platforms,
  bounty,
  ideaId,
}: {
  supporters: number;
  platforms: string[];
  bounty: number;
  ideaId?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [count, setCount] = useState(supporters);

  function handleSupport() {
    if (supported) return;
    setSupported(true);
    setCount((c) => c + 1);
  }

  // 若存在跨页标记 pendingSupport:{id}，则初始化为已支持并+1
  useEffect(() => {
    if (!ideaId) return;
    const key = `pendingSupport:${ideaId}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      setSupported(true);
      setCount((c) => c + 1);
    }
  }, [ideaId]);

  return (
    <div className="sticky top-24 space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <button
          onClick={handleSupport}
          disabled={supported}
          className={`w-full rounded-xl px-5 py-3 text-[16px] font-semibold text-white ${supported ? "bg-gray-400" : "bg-[#2ECC71] hover:bg-[#27AE60]"}`}
        >
          {supported ? "✓ 已想要" : "我也要"}
        </button>
        <p className="mt-2 text-center text-[13px] text-gray-600">
          已有 {Intl.NumberFormat("zh-CN").format(count)} 人想要
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <Link
          href={`/projects/new?idea_id=${ideaId ?? "123"}`}
          className="block w-full rounded-xl border border-[#2ECC71] px-5 py-3 text-center text-[16px] font-semibold text-[#2ECC71] hover:bg-[#2ECC71]/10"
        >
          我来解决
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <ul className="space-y-3 text-[14px] text-[#2c3e50]">
          <li className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F1C40F" className="h-5 w-5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" fill="#FFD95E" />
            </svg>
            <span>悬赏金额：￥{bounty}</span>
          </li>
          <li className="flex items-center gap-2">
            <span>期望终端：</span>
            <div className="flex flex-wrap gap-2">
              {platforms.map((t) => (
                <span key={t} className="rounded-full bg-gray-100 px-3 py-1 text-[12px] text-gray-700">
                  {t}
                </span>
              ))}
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}


