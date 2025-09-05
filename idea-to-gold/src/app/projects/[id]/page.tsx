// 公开项目详情页（/projects/[id]）：对所有用户可见的只读页面，使用公开接口 /api/projects/[id] 服务端渲染项目详情
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';

// API 响应类型定义，严禁 any，字段与后端接口保持一致
interface DeveloperInfo {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
}

interface FromIdeaInfo {
  id: string;
  title: string | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  developer?: DeveloperInfo;
  fromIdea?: FromIdeaInfo;
  product_info?: Record<string, unknown> | null;
  metrics?: { favorites?: number };
  created_at?: string;
  updated_at?: string;
}

interface ProjectDetailResponse {
  message: string;
  project?: ProjectDetail;
  error?: string;
}

function resolveBaseUrl(): string {
  // 优先使用显式配置的 NEXT_PUBLIC_BASE_URL（如生产环境 Cloudflare Pages 的自定义域名）
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  // 兼容本地开发与边缘环境：根据请求头动态构造同源绝对地址
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  let proto = h.get('x-forwarded-proto') || '';

  // 本地开发强制 http，避免使用 https 造成证书问题
  const lowerHost = host.toLowerCase();
  if (lowerHost.includes('127.0.0.1') || lowerHost.includes('localhost')) {
    proto = 'http';
  }
  if (!proto) proto = 'https';

  return host ? `${proto}://${host}` : '';
}

export default async function PublicProjectPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const baseUrl = resolveBaseUrl();
  const res = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  const data = (await res.json()) as ProjectDetailResponse;

  if (!res.ok || !data.project) {
    return (
      <main className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-[#2c3e50]">项目不存在或已被删除</h1>
          <p className="mt-2 text-[#95a5a6]">{data?.message || '请返回产品广场继续浏览其他项目。'}</p>
          <div className="mt-4">
            <Link href="/projects" className="inline-block rounded-md bg-[#3498db] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2980b9]">返回产品广场</Link>
          </div>
        </header>
      </main>
    );
  }

  const p = data.project;
  const favorites = typeof p.metrics?.favorites === 'number' ? p.metrics.favorites : undefined;

  return (
    <main className="space-y-6">
      {/* 顶部标题区 */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2c3e50]">{p.name}</h1>
          <p className="mt-2 text-sm text-gray-600">项目状态：<span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-gray-700">{p.status}</span></p>
        </div>
        <div className="flex items-center gap-3">
          {p.developer?.avatar_url ? (
            <Image src={p.developer.avatar_url} alt="开发者头像" width={40} height={40} className="rounded-full object-cover" unoptimized />
          ) : (
            // 兜底头像（内联SVG，避免外部依赖）
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Zm0 2c-3.866 0-7 3.134-7 7h14c0-3.866-3.134-7-7-7Z" fill="currentColor"/>
              </svg>
            </div>
          )}
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[#2c3e50]">{p.developer?.nickname ?? '匿名开发者'}</div>
            <div className="text-xs text-gray-500">{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</div>
          </div>
        </div>
      </header>

      {/* 主体内容卡片 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#2c3e50]">项目简介</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{p.description || '暂无项目简介'}</p>

        {/* 源自创意信息（可选）*/}
        {p.fromIdea?.id && (
          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <div className="border-l-4 border-gray-300 pl-4 text-sm text-gray-700">
              <div className="mb-1 text-gray-500">源于创意</div>
              <Link href={`/creatives/${p.fromIdea.id}`} className="text-[#3498db] hover:underline">{p.fromIdea.title ?? '查看创意详情'}</Link>
            </div>
          </div>
        )}

        {/* 简单指标 */}
        <div className="mt-6 flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#e67e22]"></span>
            <span>收藏：{typeof favorites === 'number' ? favorites : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#2ecc71]"></span>
            <span>最近更新：{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </section>

      {/* 底部导航 */}
      <div className="flex items-center justify-between">
        <Link href="/projects" className="text-sm text-[#3498db] hover:underline">返回产品广场</Link>
        {/* 公共页不显示编辑/发布入口，保持只读 */}
      </div>
    </main>
  );
}