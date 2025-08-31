// 我的项目列表（当前用户）页面
"use client";
// 声明允许cloudflare将动态页面部署到'边缘环境'上
export const runtime = 'edge';

import Link from "next/link";
import { useState, useEffect } from "react";
import type React from "react";
import type { SVGProps } from "react";
import Image from "next/image";
import { requireSupabaseClient } from '@/lib/supabase';
// 移除未使用的 Breadcrumb 导入

type Project = {
  id: string;
  name: string;
  status: "规划中" | "开发中" | "内测中" | "已发布";
  intro: string;
  fromIdeaTitle: string;
  fromIdeaHref: string;
  views: number;
  supports: number;
};

function StatusBadge({ status }: { status: Project["status"] }) {
  const isDeveloping = status === "开发中";
  const colorClass = isDeveloping
    ? "bg-green-100 text-green-700 border-green-200"
    : "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function ProjectCard({ project, href }: { project: Project; href: string }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* 顶部：项目名称 */}
      <div>
        <h3 className="text-[18px] font-semibold text-[#2c3e50]">{project.name}</h3>

        {/* 中部：状态 + 一句话简介 */}
        <div className="mt-3 flex items-center gap-3">
          <StatusBadge status={project.status} />
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-600">{project.intro}</p>

        {/* 底部：引用 + 关键数据 */}
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="flex-1 border-l-4 border-gray-200 pl-3">
            <Link href={project.fromIdeaHref} className="text-[13px] text-[#3498db] hover:underline">
              源于创意：{project.fromIdeaTitle}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-[12px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="h-4 w-4" /> {project.views}
            </span>
            <span className="inline-flex items-center gap-1">
              <HeartIcon className="h-4 w-4" /> {project.supports}
            </span>
          </div>
        </div>
      </div>

      {/* 操作区 */}
      <div className="mt-5">
        <Link
          href={href}
          className="block w-full rounded-lg bg-[#2ECC71] px-4 py-2.5 text-center text-[14px] font-semibold text-white hover:bg-[#27AE60]"
        >
          管理项目
        </Link>
      </div>
    </div>
  );
}

export default function ProjectsPage(): React.ReactElement {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取用户项目数据
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        setError(null);

        // 在客户端环境中获取 Supabase 客户端
        const supabase = requireSupabaseClient();

        // 获取当前用户的认证状态
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('请先登录');
          return;
        }

        // 调用API获取项目列表
        const response = await fetch('/api/projects/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
          setProjects(result.data);
        } else {
          throw new Error(result.message || '获取项目列表失败');
        }
      } catch (err) {
        console.error('获取项目列表失败:', err);
        setError(err instanceof Error ? err.message : '获取项目列表失败');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []); // 只在组件挂载时执行一次

  const hasProjects = projects.length > 0;
  const totalCount = projects.length;
  const planningCount = projects.filter((p) => p.status === "规划中").length;
  const developingCount = projects.filter((p) => p.status === "开发中").length;
  const betaCount = projects.filter((p) => p.status === "内测中").length;
  const publishedCount = projects.filter((p) => p.status === "已发布").length;

  const [activeTab, setActiveTab] = useState<"全部" | Project["status"]>("全部");
  const projectsToRender =
    activeTab === "全部" ? projects : projects.filter((p) => p.status === activeTab);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-[#2c3e50]">我的项目</h1>
      <p className="mt-2 text-[#95a5a6]">每一个项目，都是改变世界的一次尝试</p>

      {/* 加载状态 */}
      {loading && (
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ECC71]"></div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="mt-8 rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">加载失败</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              {error === '请先登录' && (
                <div className="mt-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    前往登录
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 只有在非加载和非错误状态下才显示内容 */}
      {!loading && !error && (
        <>
          {/* 选项卡（前端演示筛选） */}
      <div className="mt-6 w-fit rounded-lg bg-gray-100 p-1">
        {([
          { key: "全部", label: `全部 (${totalCount})` },
          { key: "规划中", label: `规划中 (${planningCount})` },
          { key: "开发中", label: `开发中 (${developingCount})` },
          { key: "内测中", label: `内测中 (${betaCount})` },
          { key: "已发布", label: `已发布 (${publishedCount})` },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === tab.key
                ? "bg-[#2ECC71] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            }`}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 空状态 */}
      {!hasProjects && (
        <section className="mt-16 flex flex-col items-center justify-center text-center">
          <Image src="/globe.svg" alt="empty" width={112} height={112} className="h-28 w-28 opacity-70" />
          <h3 className="mt-6 text-xl font-semibold text-[#2c3e50]">你还没有开始任何项目</h3>
          <p className="mt-2 text-sm text-gray-600">
            去
            <Link href="/creatives" className="mx-1 text-[#3498db] hover:underline">
              创意广场
            </Link>
            发现一个能点燃你热情的想法吧！
          </p>
        </section>
      )}

        {/* 项目卡片列表 */}
        {hasProjects && (
          <section className="mt-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projectsToRender.map((p) => (
                <ProjectCard key={p.id} project={p} href={`/projects/me/${p.id}`} />
              ))}
            </div>
          </section>
        )}
        </>
      )}
    </>
  );
}


