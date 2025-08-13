"use client";

import { useState } from "react";
import CreativityCard from "@/components/CreativityCard";
import { ideas } from "@/data/ideas";
import Link from "next/link";
import { slugify } from "@/lib/slug";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"热门" | "最新">("热门");
  const sampleIdeas = ideas;

  const ideasToShow = [...sampleIdeas].sort((a, b) => {
    if (activeTab === "热门") return b.upvoteCount - a.upvoteCount;
    return b.createdAt - a.createdAt;
  });

  // 首页为创意广场展示，无提交表单

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold tracking-tight text-[#2c3e50]">点子广场</h1>
      <p className="mt-2 text-[#95a5a6]">连接真实需求与AI开发者，让每个好创意都能“点石成金”。</p>

      {/* 筛选 Tab */}
      <div className="mt-6 w-fit rounded-lg bg-gray-100 p-1">
        {(["热门", "最新"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === tab
                ? "bg-[#2ECC71] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3 列网格渲染 6 张卡片 */}
      <section className="mt-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ideasToShow.map((item) => (
            <Link
              key={item.id}
              href={`/idea/${item.id}/${slugify(item.title)}`}
              className="block"
            >
              <CreativityCard
                {...item}
                onCardClick={undefined}
              />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
