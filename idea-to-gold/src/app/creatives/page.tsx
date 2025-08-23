// 创意广场页面
"use client";

import { useState, useEffect } from "react";
import CreativityCard from "@/components/CreativityCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requireSupabaseClient } from "@/lib/supabase";

// 定义创意数据类型
interface Creative {
  id: string | number; // 兼容 UUID 或 int
  title: string;
  description: string;
  terminals: string[] | string;
  bounty_amount: number;
  created_at: string;
  author_id: string;
  profiles: {
    nickname?: string;
    avatar_url?: string;
  } | null;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"热门" | "最新">("热门");
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 未登录也允许访问首页：直接加载创意列表
  useEffect(() => {
    const fetchCreatives = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/creatives');
        const result = await response.json();
        
        if (response.ok) {
          setCreatives(result.creatives || []);
        } else {
          setError(result.message || '获取创意列表失败');
        }
      } catch (err) {
        setError('网络错误，请稍后重试');
        console.error('Failed to fetch creatives:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatives();
  }, []);

  // 点击“发布创意”按钮的处理：未登录 -> 提示并跳登录；已登录 -> 跳转到发布页
  const handleCreateClick = async (_e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const supabase = requireSupabaseClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;

      if (sessionError || !accessToken) {
        localStorage.setItem('pendingToast', '请先登录后再发布创意');
        window.dispatchEvent(new Event('localToast'));
        router.push('/login');
        return;
      }

      router.push('/creatives/new');
    } catch (_err) {
      // 兜底：若出现异常，仍然引导到登录页
      localStorage.setItem('pendingToast', '请先登录后再发布创意');
      window.dispatchEvent(new Event('localToast'));
      router.push('/login');
    }
  };

  // 转换 Creative 数据为 CreativityCard 组件所需的格式
  const convertToCardData = (creative: Creative) => {
    return {
      id: creative.id, // 使用 UUID 或自增ID
      authorName: creative.profiles?.nickname || `用户${creative.author_id.slice(-4)}`,
      authorAvatarUrl: creative.profiles?.avatar_url,
      publishedAtText: new Date(creative.created_at).toLocaleDateString('zh-CN'),
      title: creative.title,
      description: creative.description,
      tags: Array.isArray(creative.terminals) ? creative.terminals : [creative.terminals].filter(Boolean),
      upvoteCount: Math.floor(Math.random() * 1000), // 暂时使用随机数，后续可扩展为真实数据
      commentCount: Math.floor(Math.random() * 100),
      createdAt: new Date(creative.created_at).getTime(),
    };
  };

  const ideasToShow = [...creatives].sort((a, b) => {
    if (activeTab === "热门") {
      // 热门按随机（模拟点赞数）排序
      return Math.random() - 0.5;
    }
    // 最新按创建时间倒序（API 已按此排序）
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // 首页为创意广场展示，无提交表单
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-[#2c3e50]">创意广场</h1>
      <p className="mt-2 text-[#95a5a6]">连接真实需求与AI开发者，让每个好创意都能&quot;点石成金&quot;。</p>

      {/* 筛选 Tab 与 发布按钮同一行 */}
      <div className="mt-6 flex items-center justify-between">
        {/* 左侧：筛选 Tab */}
        <div className="rounded-lg bg-gray-100 p-1 inline-flex">
          {(["热门", "最新"] as Array<"热门" | "最新">).map((tab) => (
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

        {/* 右侧：发布创意按钮（含未登录拦截） */}
        <button
          type="button"
          onClick={handleCreateClick}
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
        >
          + 发布创意
        </button>
      </div>
      {/* 加载状态 */}
      {loading && (
        <div className="mt-8 text-center text-gray-500">
          正在加载创意列表...
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="mt-8 text-center text-red-500">
          {error}
        </div>
      )}

      {/* 3 列网格渲染创意卡片 */}
      {!loading && !error && (
        <section className="mt-8">
          {ideasToShow.length === 0 ? (
            <div className="text-center text-gray-500 mt-16">
              还没有创意发布，快去 <Link href="/creatives/new" className="text-[#3498db] hover:underline">发布第一个创意</Link> 吧！
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {ideasToShow.map((creative) => {
                const cardData = convertToCardData(creative);
                return (
                  <Link
                    key={String(creative.id)}
                    href={`/idea/${creative.id}`}
                    className="block"
                  >
                    <CreativityCard
                      {...cardData}
                      onCardClick={undefined}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </>
  );
}
