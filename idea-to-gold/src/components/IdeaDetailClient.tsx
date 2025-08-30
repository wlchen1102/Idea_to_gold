"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import CommentsSection from "@/components/CommentsSection";
import RightInfo from "@/components/RightInfo";
import ClientEffects from "@/components/ClientEffects";
import Breadcrumb from "@/components/Breadcrumb";
import IdeaEditor from "@/components/IdeaEditor";
import { PageLoading } from "@/components/GlobalLoading";
import { useGlobalLoading } from "@/components/GlobalLoading";

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

// 创意数据类型
type Creative = {
  id: string | number;
  title: string;
  description?: string;
  created_at: string;
  terminals: string[] | string;
  bounty_amount?: number;
  profiles?: { nickname?: string; avatar_url?: string };
  author_id?: string;
  upvote_count?: number;
};

interface IdeaDetailClientProps {
  id: string;
}

export default function IdeaDetailClient({ id }: IdeaDetailClientProps) {
  const [creative, setCreative] = useState<Creative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setLoading: setGlobalLoading, setLoadingText } = useGlobalLoading();

  useEffect(() => {
    const fetchCreative = async () => {
      try {
        setGlobalLoading(true);
        setLoadingText('正在加载创意详情...');
        
        const response = await fetch(`/api/creatives/${encodeURIComponent(id)}`);
        
        if (response.ok) {
          const data = await response.json();
          setCreative(data?.creative ?? null);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData?.message || '获取创意详情失败');
        }
      } catch (err) {
        setError('网络连接错误，请稍后重试');
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    };

    fetchCreative();
  }, [id, setGlobalLoading, setLoadingText]);

  // 如果正在加载，显示页面级loading
  if (loading) {
    return (
      <>
        <Breadcrumb paths={[{ href: "/creatives", label: "创意广场" }, { label: "创意详情" }]} />
        <PageLoading text="正在加载创意详情..." />
      </>
    );
  }

  // 如果没有找到创意，显示友好的错误页面
  if (!creative) {
    return (
      <>
        <Breadcrumb paths={[{ href: "/creatives", label: "创意广场" }, { label: "创意详情" }]} />
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-[#2c3e50] mb-4">未找到创意</h1>
          <p className="text-gray-600 mb-6">
            {error || "抱歉，我们无法找到您请求的创意。可能它已被删除或URL不正确。"}
          </p>
          <div className="space-x-4">
            <Link 
              href="/creatives" 
              className="inline-block px-6 py-2 bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] transition-colors"
            >
              返回创意广场
            </Link>
            <Link 
              href="/creatives/new" 
              className="inline-block px-6 py-2 border border-[#2ECC71] text-[#2ECC71] rounded-lg hover:bg-[#2ECC71] hover:text-white transition-colors"
            >
              发布新创意
            </Link>
          </div>
        </div>
      </>
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
    supporters: Number(creative.upvote_count ?? 0),
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

          {/* 将编辑入口移动到"创意描述"标题的右侧，仅作者可见 */}
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
            initialComments={null}
          />
        </section>
      </div>

      <ClientEffects ideaId={String(idea.id)} />
    </>
  );
}