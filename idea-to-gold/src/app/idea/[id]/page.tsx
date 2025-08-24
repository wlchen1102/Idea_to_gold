// 创意详情页面
// 声明允许cloudflare将动态页面部署到‘边缘环境’上
export const runtime = 'edge';
import type { Metadata } from "next";
import Link from "next/link";
// 删除未使用的 ideas 导入
import CommentsSection from "@/components/CommentsSection";
import RightInfo from "@/components/RightInfo";
import ClientEffects from "@/components/ClientEffects";
import Breadcrumb from "@/components/Breadcrumb";
import { headers } from "next/headers";
import Image from "next/image";
import IdeaEditor from "@/components/IdeaEditor";

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

// 将动态路由参数改为 id
type PageParams = { id: string };
type PageProps = { params: Promise<PageParams> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `创意详情 - #${id}`, description: "查看创意详情" };
}

export default async function IdeaDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  // 使用后端类型定义的 Creative 结构
  type Creative = {
    id: string | number
    title: string
    description?: string
    created_at: string
    terminals: string[] | string
    bounty_amount?: number
    profiles?: { nickname?: string; avatar_url?: string }
    author_id?: string
    upvote_count?: number // 新增：点赞数量
  }

  let creative: Creative | null = null;
  let error: string | null = null;
  
  try {
    // 服务端渲染下构造绝对 URL
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "127.0.0.1:8788";
    const protocol = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    const res = await fetch(`${baseUrl}/api/creatives/${encodeURIComponent(id)}`, { cache: "no-store" });
    const json = await res.json();
    
    if (res.ok) {
      creative = json?.creative ?? null;
    } else {
      error = json?.message || "获取创意详情失败";
    }
  } catch (e) {
    error = "网络连接错误，请稍后重试";
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
    supporters: Number(creative.upvote_count ?? 0), // 以真实 upvote_count 初始化
  };

  const projects = [
    { id: "p1", dev: { name: "Ken" }, status: "开发中" },
    { id: "p2", dev: { name: "Iris" }, status: "开发中" },
  ];


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
          <RightInfo supporters={idea.supporters} platforms={idea.platforms} bounty={idea.bounty} ideaId={String(idea.id)} />
        </aside>
        <section className="md:col-span-2">
          <CommentsSection ideaId={String(creative.id)} />
        </section>
      </div>

      <ClientEffects ideaId={String(idea.id)} />
    </>
  );
}