// 创意详情页面
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CommentsSection from "@/components/CommentsSection";
import RightInfo from "@/components/RightInfo";
import ClientEffects from "@/components/ClientEffects";
import Breadcrumb from "@/components/Breadcrumb";
import LoadingSpinner from "@/components/LoadingSpinner";
import Image from "next/image";
import IdeaEditor from "@/components/IdeaEditor";
import { useParams } from "next/navigation";

// 复用 avatar 小组件
function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      <Image src={src} alt={name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" unoptimized />
    );
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ecf0f1] text-[#2c3e50] text-sm font-semibold">
      {initials}
    </div>
  );
}

// 定义创意数据类型
type Creative = {
  id: string | number
  title: string
  description?: string
  created_at: string
  terminals: string[] | string
  bounty_amount?: number
  profiles?: { nickname?: string; avatar_url?: string }
  author_id?: string
  upvote_count?: number
}

export default function IdeaDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [creative, setCreative] = useState<Creative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 客户端数据获取
  useEffect(() => {
    const fetchCreative = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/creatives/${encodeURIComponent(id)}`);
        
        if (response.ok) {
          const data = await response.json();
          setCreative(data?.creative ?? null);
        } else {
          const errorData = await response.json();
          setError(errorData?.message || "获取创意详情失败");
        }
      } catch {
        setError("网络连接错误，请稍后重试");
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchCreative();
    }
  }, [id]);
  
  // 设置页面标题
  useEffect(() => {
    if (creative) {
      document.title = `创意详情 - #${id}`;
    }
  }, [creative, id]);

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }
  
  // 如果没有找到创意，显示友好的错误页面
  if (error || !creative) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🤔</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {error || "创意不存在"}
            </h1>
            <p className="text-gray-600 mb-6">
              {error ? "请稍后重试" : "这个创意可能已被删除或不存在"}
            </p>
            <Link
              href="/creatives"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回创意广场
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 将真实描述字符串切分为段落数组；若没有真实描述，使用默认描述
  const descriptionParas: string[] = creative?.description
    ? String(creative.description)
        .split(/\n{2,}|\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [
        "这是一个用于说明的创意详情占位文本。",
        "系统会定时抓取数据并生成指标曲线，用户可以为自己关注的主题设置预警阈值。",
        "后续将开放更多功能，欢迎留言讨论。",
      ];

  const idea = {
    id: creative.id,
    title: creative.title,
    author: {
      name: creative?.profiles?.nickname ?? "匿名用户",
      time: new Date(creative.created_at).toLocaleDateString('zh-CN'),
      avatarUrl: creative?.profiles?.avatar_url || undefined,
    },
    description: descriptionParas,
    platforms: Array.isArray(creative.terminals) ? creative.terminals : [creative.terminals].filter(Boolean),
    bounty: creative.bounty_amount || 500,
    supporters: Number(creative.upvote_count ?? 0), // 以真实 upvote_count 初始化
  };




  return (
    <>
      <Breadcrumb paths={[{ href: "/creatives", label: "创意广场" }, { label: "创意详情" }]} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-extrabold leading-9 text-[#2c3e50]">{idea.title}</h1>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={idea.author.name} src={idea.author.avatarUrl} />
            <div>
              <p className="text-[14px] font-medium text-[#2c3e50]">{idea.author.name}</p>
              <p className="text-[12px] text-[#95a5a6]">{idea.author.time}</p>
            </div>
          </div>

          {/* 将编辑入口移动到“创意描述”标题的右侧，仅作者可见 */}
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#2c3e50]">创意描述</h2>
            {creative?.author_id ? (
              <IdeaEditor
                id={String(creative.id)}
                initialTitle={creative.title}
                initialDescription={creative.description ?? ""}
                authorId={creative.author_id}
                initialTerminals={Array.isArray(creative.terminals) ? creative.terminals : [creative.terminals].filter(Boolean)}
              />
            ) : null}
          </div>
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 md:p-4">
            {idea.description.map((para, idx) => (
              <p key={idx} className="text-[15px] leading-7 text-gray-700 mb-4 last:mb-0">{para}</p>
            ))}
          </div>
        </section>

        <aside className="md:col-span-1">
          <RightInfo 
            supporters={idea.supporters} 
            platforms={idea.platforms} 
            bounty={idea.bounty} 
            ideaId={String(idea.id)}
            initialUpvoteData={null}
          />
        </aside>
        <section className="md:col-span-2">
          <CommentsSection 
            ideaId={String(creative.id)} 
            initialComments={undefined}
          />
        </section>
      </div>

      <ClientEffects ideaId={String(idea.id)} />
    </>
  );
}