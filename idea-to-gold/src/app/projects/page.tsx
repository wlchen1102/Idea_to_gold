// 我的项目页面
"use client";

import Link from "next/link";
import { useState } from "react";
import type React from "react";
import type { SVGProps } from "react";
import Breadcrumb from "@/components/Breadcrumb";

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
  // 模拟数据：4 个项目卡片
  const projects: Project[] = [
    {
      id: "p1",
      name: "会议纪要自动化助手",
      status: "开发中",
      intro: "将会议录音转写并自动抽取行动项，支持与团队协作工具同步。",
      fromIdeaTitle: "AI会议纪要助手",
      fromIdeaHref: "/idea/1",
      views: 1280,
      supports: 312,
    },
    {
      id: "p2",
      name: "语音转写与摘要服务",
      status: "内测中",
      intro: "高准确率语音识别与多语种摘要引擎，为企业会议提供结构化输出。",
      fromIdeaTitle: "多语种语音摘要助手",
      fromIdeaHref: "/idea/2",
      views: 860,
      supports: 190,
    },
    {
      id: "p3",
      name: "企业会议纪要机器人",
      status: "开发中",
      intro: "面向钉钉/企微的企业内协作机器人，自动输出纪要与OKR映射。",
      fromIdeaTitle: "企业版会议纪要机器人",
      fromIdeaHref: "/idea/3",
      views: 2034,
      supports: 528,
    },
    {
      id: "p4",
      name: "智能行动项追踪器",
      status: "已发布",
      intro: "基于NLP的行动项归因与提醒工具，帮助团队闭环推进任务。",
      fromIdeaTitle: "行动项提取与提醒",
      fromIdeaHref: "/idea/4",
      views: 640,
      supports: 120,
    },
  ];

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
          <img src="/globe.svg" alt="empty" className="h-28 w-28 opacity-70" />
          <h3 className="mt-6 text-xl font-semibold text-[#2c3e50]">你还没有开始任何项目</h3>
          <p className="mt-2 text-sm text-gray-600">
            去
            <Link href="/" className="mx-1 text-[#3498db] hover:underline">
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
            {projectsToRender.map((p, idx) => (
              <ProjectCard key={p.id} project={p} href={`/project/${idx + 1}`} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}


