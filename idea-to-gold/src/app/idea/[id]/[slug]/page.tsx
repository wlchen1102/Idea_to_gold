import type { Metadata } from "next";
import Link from "next/link";
import { ideas } from "@/data/ideas";
import CommentsSection from "@/components/CommentsSection";
import RightInfo from "@/components/RightInfo";
import ClientEffects from "@/components/ClientEffects";
import Breadcrumb from "@/components/Breadcrumb";

// 复用 avatar 小组件
function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="h-10 w-10 rounded-full object-cover" />;
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

type PageParams = { id: string; slug: string };
type PageProps = { params: Promise<PageParams> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const idea = ideas.find((i) => i.id === id);
  const title = idea ? `${idea.title} - 点子成金` : "点子详情 - 点子成金";
  return { title, description: idea?.description };
}

export default async function IdeaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const base = ideas.find((i) => i.id === id);
  const idea = {
    id,
    title: base?.title ?? "未找到创意",
    author: { name: base?.authorName ?? "匿名", time: base?.publishedAtText ?? "" },
    description: [
      (base?.description ?? "").repeat(1) ||
        "这是一个用于说明的创意详情占位文本。",
      "系统会定时抓取数据并生成指标曲线，用户可以为自己关注的主题设置预警阈值。",
      "后续将开放更多功能，欢迎留言讨论。",
    ],
    platforms: base?.tags ?? [],
    bounty: 500,
    supporters: base?.upvoteCount ?? 0,
  };

  const projects = [
    { id: "p1", dev: { name: "Ken" }, status: "开发中" },
    { id: "p2", dev: { name: "Iris" }, status: "开发中" },
  ];

  const initialComments = [
    { id: "c1", author: "李产品", content: "想法很有意思，可以考虑引入行业新闻的权重因子。", time: "1小时前" },
    { id: "c2", author: "Zoe", content: "感谢建议！权重会在下个版本支持自定义配置。", time: "58分钟前", isAuthor: true },
    { id: "c3", author: "阿明", content: "是否支持 A 股和美股同时追踪？", time: "30分钟前" },
  ];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Breadcrumb paths={[{ href: "/", label: "创意广场" }, { label: "点子详情" }]} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <h1 className="text-3xl font-extrabold leading-9 text-[#2c3e50]">{idea.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={idea.author.name} />
            <div>
              <p className="text-[14px] font-medium text-[#2c3e50]">{idea.author.name}</p>
              <p className="text-[12px] text-[#95a5a6]">{idea.author.time}</p>
            </div>
          </div>

          <h2 className="mt-6 text-lg font-semibold text-[#2c3e50]">创意描述</h2>
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-6 md:p-8">
            {idea.description.map((para, idx) => (
              <p key={idx} className="text-[15px] leading-7 text-gray-700">{para}</p>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[#2c3e50]">2位造物者正在尝试</h3>
            <ul className="space-y-3">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.dev.name} />
                    <span className="text-[14px] text-[#2c3e50]">{p.dev.name}</span>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[12px] text-gray-700">{p.status}</span>
                </li>
              ))}
            </ul>
          </div>

          <CommentsSection ideaId={idea.id} initialComments={initialComments} />
        </section>

        <aside className="md:col-span-1">
          <RightInfo ideaId={idea.id} supporters={idea.supporters} platforms={idea.platforms} bounty={idea.bounty} />
        </aside>
      </div>
    </div>
  );
}

