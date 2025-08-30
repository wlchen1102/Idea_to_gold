// 用户个人中心页面
"use client";
// 声明允许cloudflare将动态页面部署到‘边缘环境’上
export const runtime = 'edge';
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CreativityCard from "@/components/CreativityCard";

type TabType = "createdIdeas" | "supportedIdeas" | "developedProjects";

export default function ProfilePage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const userId = params.userId as string;
  const [activeTab, setActiveTab] = useState<TabType>("createdIdeas");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面主体 */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* 身份卡 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* 左侧：头像 */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-4xl font-bold">
                Z
              </div>
            </div>

            {/* 右侧：信息 */}
            <div className="flex-grow">
              {/* 昵称和等级 */}
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">Zoe</h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300">
                  Lv.5
                </span>
              </div>

              {/* 个人简介 */}
              <p className="text-gray-600 text-base mb-4 leading-relaxed">
                热爱创新的产品设计师，专注于用户体验和交互设计。相信好的设计能够改变世界，让生活变得更美好。欢迎与我交流设计心得！
              </p>

              {/* 核心数据统计 */}
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">1,280</div>
                  <div className="text-sm text-gray-500">声望</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">15</div>
                  <div className="text-sm text-gray-500">提出的创意</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">3</div>
                  <div className="text-sm text-gray-500">开发的项目</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="bg-white rounded-lg shadow-md">
          {/* Tab 标题栏 */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6" aria-label="选项卡">
              <button
                onClick={() => setActiveTab("createdIdeas")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "createdIdeas"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={activeTab === "createdIdeas" ? "page" : undefined}
              >
                提出的创意
              </button>
              <button
                onClick={() => setActiveTab("supportedIdeas")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "supportedIdeas"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={activeTab === "supportedIdeas" ? "page" : undefined}
              >
                支持的创意
              </button>
              <button
                onClick={() => setActiveTab("developedProjects")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "developedProjects"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={activeTab === "developedProjects" ? "page" : undefined}
              >
                开发的项目
              </button>
            </nav>
          </div>

          {/* Tab 内容面板 */}
          <div className="p-6">
            {activeTab === "createdIdeas" && (
              <div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <CreativityCard
                    authorName="Zoe"
                    publishedAtText="3 小时前"
                    title="用AI为创作者生成个性化封面"
                    description="根据创作者的风格库与当期话题，自动生成平台原生风格的封面，提高点击率。"
                    tags={["网页", "AI"]}
                    upvoteCount={328}
                    commentCount={24}
                  />
                  <CreativityCard
                    authorName="Zoe"
                    publishedAtText="昨天"
                    title="轻量级会议纪要助手"
                    description="浏览器插件，录制在线会议并自动生成纪要与行动项，支持导出到 Notion。"
                    tags={["Chrome 插件", "效率"]}
                    upvoteCount={512}
                    commentCount={47}
                  />
                  <CreativityCard
                    authorName="Zoe"
                    publishedAtText="2 天前"
                    title="小团队知识库同步工具"
                    description="自动从多平台同步文档到一个统一知识库，并做摘要和标签归类。"
                    tags={["SaaS", "知识管理"]}
                    upvoteCount={189}
                    commentCount={13}
                  />
                </div>
              </div>
            )}

            {activeTab === "supportedIdeas" && (
              <div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <CreativityCard
                    authorName="Alex"
                    publishedAtText="5 小时前"
                    title="跨平台待办协作板"
                    description="把日历、待办和看板融合到一起，支持家庭与小团队协作。"
                    tags={["移动端", "协作"]}
                    upvoteCount={233}
                    commentCount={18}
                  />
                  <CreativityCard
                    authorName="Mia"
                    publishedAtText="3 天前"
                    title="图片批量去背景云服务"
                    description="面向电商卖家与设计师的批量去背景引擎，开放 API 接入。"
                    tags={["云服务", "图像"]}
                    upvoteCount={740}
                    commentCount={92}
                  />
                  <CreativityCard
                    authorName="Leo"
                    publishedAtText="上周"
                    title="RSS 智能聚合器"
                    description="用大模型给订阅源做去重与摘要，节省阅读时间。"
                    tags={["阅读", "AI"]}
                    upvoteCount={401}
                    commentCount={35}
                  />
                </div>
              </div>
            )}

            {activeTab === "developedProjects" && (
              <div>
                {/* 轻量内联 ProjectCard，只用于个人主页演示复用样式 */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div>
                      <h3 className="text-[18px] font-semibold text-[#2c3e50]">会议纪要自动化助手</h3>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 border-green-200">开发中</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">将会议录音转写并自动抽取行动项，支持与团队协作工具同步。</p>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="flex-1 border-l-4 border-gray-200 pl-3">
                          <Link href="/idea/1" className="text-[13px] text-[#3498db] hover:underline">
                            源于创意：AI会议纪要助手
                          </Link>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 text-[12px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                            1280
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /></svg>
                            312
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <Link href="/project/1" className="block w-full rounded-lg bg-[#2ECC71] px-4 py-2.5 text-center text-[14px] font-semibold text-white hover:bg-[#27AE60]">
                        管理项目
                      </Link>
                    </div>
                  </div>

                  <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div>
                      <h3 className="text-[18px] font-semibold text-[#2c3e50]">智能行动项追踪器</h3>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border-gray-200">已发布</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">基于NLP的行动项归因与提醒工具，帮助团队闭环推进任务。</p>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="flex-1 border-l-4 border-gray-200 pl-3">
                          <Link href="/idea/2" className="text-[13px] text-[#3498db] hover:underline">
                            源于创意：行动项提取与提醒
                          </Link>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 text-[12px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                            640
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /></svg>
                            120
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <Link href="/project/2" className="block w-full rounded-lg bg-[#2ECC71] px-4 py-2.5 text-center text-[14px] font-semibold text-white hover:bg-[#27AE60]">
                        管理项目
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}