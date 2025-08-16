"use client";

import Link from "next/link";
import React, { useState } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import Modal from "@/components/Modal";

type PageParams = { id: string };
type PageProps = { params: Promise<PageParams> };

function Avatar({ name }: { name: string }) {
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

function Step({
  icon,
  label,
  state,
}: {
  icon: string;
  label: string;
  state: "done" | "active" | "todo";
}) {
  const circleColorClass =
    state === "active"
      ? "border-[#2ECC71] text-[#2ECC71]"
      : state === "done"
      ? "border-gray-700 text-gray-700"
      : "border-gray-300 text-gray-400";
  const labelColorClass =
    state === "active" ? "text-[#2ECC71]" : state === "done" ? "text-gray-600" : "text-gray-400";

  return (
    <div className="flex flex-col items-center">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${circleColorClass}`}>
        <span className="text-base" aria-hidden>
          {state === "done" ? "✓" : icon}
        </span>
      </div>
      <div className={`mt-1 text-xs font-medium ${labelColorClass}`}>{label}</div>
    </div>
  );
}

type ProjectStatus = "planning" | "developing" | "internalTesting" | "released";

export default function ProjectHomePage({ params }: PageProps): React.ReactElement {
  const { id } = React.use(params);
  
  // 项目状态管理（模拟本地状态，实际应从API获取）
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("planning");
  
  // 新增：简单的发布状态控制（用于演示已发布页面布局）
  const [status, setStatus] = useState('published'); // 改为 'draft' 可查看原布局
  
  // 控制"完成当前阶段"确认弹窗
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Tab 状态管理（用于已发布页面）
  const [activeTab, setActiveTab] = useState('showcase');
  // 新增：图片轮播（产品展示）状态与数据（仅用于示例）
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = [0, 1, 2, 3];
  const prevSlide = () => setSlideIndex((s) => (s - 1 + slides.length) % slides.length);
  const nextSlide = () => setSlideIndex((s) => (s + 1) % slides.length);
  // 新增：评价格输入的本地状态（仅用于演示，不做实际提交）
  const [reviewText, setReviewText] = useState('');
  // 新增：模拟用户评价列表数据（按时间倒序排列）
  const mockReviews = [
    { user: 'Cindy', date: '1 天前', rating: '★★★★☆', content: '多端同步很方便，希望尽快支持会议模板。' },
    { user: 'Bob', date: '3 天前', rating: '★★★★★', content: '自动生成行动项太省心了！' },
    { user: 'Alice', date: '1 周前', rating: '★★★★☆', content: '很好用，语音转写很准确。' },
  ];
  // 新增：模拟原始创意信息
  const ideaInfo = {
    title: 'AI会议纪要助手', // 添加标题
    ideaLink: '/idea/1/ai-会议记录与行动项提取', // 添加来源链接
    author: { name: 'Zoe' },
    description:
      '这是一个将会议记录全流程自动化的创意。通过高精度语音识别将语音实时转写为文本，并利用大语言模型进行要点提炼、行动项抽取与结构化输出，最终一键同步到团队协作平台，帮助团队快速复盘、对齐信息、提升执行效率。',
    supporters: '1.5k',
  };
  // 新增：模拟开发历史时间轴数据（按时间倒序排列）
  const devHistory = [
    { author: 'Lily', time: '刚刚', title: '前端接入里程碑', content: '完成项目主页已发布视图与产品展示轮播模块上线。' },
    { author: 'Ken', time: '1 天前', title: '第一周开发进度', content: '已完成核心 API 的后端开发，准备开始前端对接与联调测试。' },
    { author: 'Zoe', time: '3 天前', title: '项目规划与功能定义 V1.0', content: '完成整体功能范围界定与优先级排序，明确 MVP：自动转写、行动项提取与协作平台同步。' },
  ];

  // 新增：发布评价功能
  const [localReviews, setLocalReviews] = useState(mockReviews);
  
  const handlePublishReview = () => {
    if (reviewText.trim()) {
      const newReview = {
        user: '你', // 当前用户
        date: '刚刚',
        rating: '★★★★★', // 默认五星
        content: reviewText.trim()
      };
      setLocalReviews([newReview, ...localReviews]); // 添加到列表顶部
      setReviewText(''); // 清空输入框
    }
  };

  const project = {
    id,
    title: "【项目】会议纪要自动化助手",
    owner: { name: "Zoe" },
    fromIdea: { title: "AI会议纪要助手", href: "/idea/1/ai-会议记录与行动项提取" },
    status: projectStatus, // 使用动态状态
  };

  // 当前阶段中文名（用于弹窗标题）
  const currentStageName =
    project.status === "planning" ? "规划中" : project.status === "developing" ? "开发中" : "内测中";

  // 下一阶段中文名
  const nextStageName =
    project.status === "planning" ? "开发中" : project.status === "developing" ? "内测中" : "已发布";

  // 确认推进阶段的处理函数
  const handleConfirmStageProgress = () => {
    let nextStatus: ProjectStatus = project.status;
    
    switch (project.status) {
      case "planning":
        nextStatus = "developing";
        break;
      case "developing":
        nextStatus = "internalTesting";
        break;
      case "internalTesting":
        nextStatus = "released";
        break;
    }
    
    setProjectStatus(nextStatus);
    setShowConfirm(false);
    
    // 这里可以添加API调用来更新服务器端状态
    console.log(`项目状态已推进：${project.status} → ${nextStatus}`);
  };

  // 已发布页面布局
  if (status === 'published') {
    return (
      <>
        <Breadcrumb paths={[{ href: "/projects", label: "我的项目" }, { label: "项目详情" }]} />
        
        {/* 大页头 (Grand Header) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* 左侧：产品身份区 */}
            <div className="flex items-start gap-4">
              {/* 产品Logo占位符 */}
              <div className="w-20 h-20 bg-gray-300 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-gray-500 text-2xl">📱</span>
              </div>
              
              {/* 产品信息 */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">会议纪要自动化助手</h1>
                <p className="text-lg text-[#7f8c8d] mb-3">释放你的会议生产力</p>
                
                {/* 平台标签 */}
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#2ECC71] text-white">
                    网页
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#3498db] text-white">
                    iOS
                  </span>
                </div>
              </div>
            </div>
            
            {/* 右侧：核心行动区 */}
            <div className="flex flex-col sm:flex-row gap-3 lg:flex-col xl:flex-row">
              <button className="bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2">
                <span>立即体验</span>
                <span>→</span>
              </button>
              <button className="border border-gray-300 hover:bg-gray-50 text-[#2c3e50] font-medium px-6 py-4 rounded-xl transition-colors">
                分享
              </button>
            </div>
          </div>
        </div>

        {/* Tab 导航栏 */}
        <div className="bg-white border border-gray-200 rounded-2xl mb-6 shadow-sm">
          <div className="flex overflow-x-auto">
            {[
              { id: 'showcase', label: '⭐ 产品展示', icon: '⭐' },
              { id: 'reviews', label: '💬 用户评价', icon: '💬' },
              { id: 'idea', label: '💡 原始创意', icon: '💡' },
              { id: 'history', label: '📜 开发历史', icon: '📜' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#2ECC71] text-[#2ECC71] bg-green-50'
                    : 'border-transparent text-[#7f8c8d] hover:text-[#2c3e50] hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span>{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 内容面板 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm min-h-[400px]">
          {activeTab === 'showcase' ? (
            <div className="space-y-8">
              {/* 产品截图轮播 */}
              <div className="relative">
                <div className="w-full h-[200px] sm:h-[280px] md:h-[360px] rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center">
                  {/* 使用内联SVG作为灰色占位图，显示尺寸与当前截图序号 */}
                  <svg viewBox="0 0 640 360" className="w-full h-full" preserveAspectRatio="none" aria-label={`产品截图 ${slideIndex + 1}`}>
                    <rect width="640" height="360" fill="#e5e7eb" />
                    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="28" fill="#9ca3af">
                      640 × 360 截图 {slideIndex + 1}
                    </text>
                  </svg>
                </div>
                {/* 左右切换按钮 */}
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="上一张"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow p-2 text-[#2c3e50]"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="下一张"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow p-2 text-[#2c3e50]"
                >
                  &gt;
                </button>
                {/* Dots 指示器 */}
                <div className="mt-3 flex justify-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`跳转到第${i + 1}张`}
                      onClick={() => setSlideIndex(i)}
                      className={`${i === slideIndex ? "w-2.5 h-2.5 bg-[#2ECC71]" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"} rounded-full transition-colors`}
                    />
                  ))}
                </div>
              </div>

              {/* 详细功能介绍 */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-[#2c3e50]">功能亮点</h3>
                <p className="text-[15px] leading-7 text-gray-700">
                  会议纪要自动化助手，基于高精度语音识别与自然语言处理，自动转写会议音频、提炼要点、生成结构化纪要，并同步到团队协作平台。
                  它可智能识别发言人、抽取行动项与关键决策，帮助团队快速复盘、对齐信息、提升执行效率。通过多端接入（网页、iOS、桌面），让你随时随地记录与回看。
                </p>
              </div>
              </div>
          ) : (
            activeTab === 'reviews' ? (
              <div className="space-y-6">
                {/* 移除"产品评价"标题 */}
                {/* 评分概览 */}
                <div className="flex items-center justify-between">
                  <div className="text-lg text-[#2c3e50]">评分：<span className="font-semibold">★★★★☆</span></div>
                  <div className="text-sm text-gray-500">共 {localReviews.length} 条评价</div>
                </div>
                {/* 评价输入 */}
                <div className="rounded-xl border border-gray-200 p-4">
                  <label htmlFor="reviewInput" className="block text-sm font-medium text-[#2c3e50] mb-2">写下你的评价</label>
                  <textarea
                    id="reviewInput"
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="分享你的使用体验吧…"
                    className="w-full rounded-md border border-gray-300 p-3 text-[14px] leading-6 focus:border-[#2ECC71] focus:outline-none"
                  />
                  <div className="mt-2 text-right">
                    <button 
                      type="button" 
                      onClick={handlePublishReview}
                      disabled={!reviewText.trim()}
                      className="rounded-md bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white hover:bg-[#27AE60] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      发布评价
                    </button>
                  </div>
                </div>
                {/* 评价列表（按时间倒序） */}
                <ul className="space-y-4">
                  {localReviews.map((r, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Avatar name={r.user} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-[14px] font-medium text-[#2c3e50]">{r.user}</div>
                          <div className="text-[12px] text-gray-500">{r.date}</div>
                        </div>
                        <div className="mt-0.5 text-sm text-[#f59e0b]">{r.rating}</div>
                        <p className="mt-1 text-[14px] leading-6 text-gray-700">{r.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : activeTab === 'idea' ? (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-[#2c3e50]">原始创意11</h3>
                
                {/* 添加来源链接 */}
                <div className="border-l-4 border-gray-300 pl-4 text-sm text-gray-700">
                  <a className="text-[#3498db] hover:underline" href={ideaInfo.ideaLink}>
                    源于创意：{ideaInfo.title}
                  </a>
                </div>
                
                {/* 创想家信息 */}
                <div className="flex items-center gap-3">
                  <Avatar name={ideaInfo.author.name} />
                  <div>
                    <div className="text-[14px] font-medium text-[#2c3e50]">{ideaInfo.author.name}</div>
                    <div className="text-[12px] text-gray-500">创想家</div>
                  </div>
                </div>
                {/* 创意描述 */}
                <div>
                  <p className="text-[15px] leading-7 text-gray-700">{ideaInfo.description}</p>
                </div>
                {/* 支持数据 */}
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-[#2c3e50]">
                  有 <span className="font-semibold text-[#2ECC71]">{ideaInfo.supporters}</span> 人想要
                </div>
              </div>
            ) : activeTab === 'history' ? (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-[#2c3e50]">开发日志</h3>
                <ul className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
                  {/* 开发历史按时间倒序排列 */}
                  {devHistory.map((log, i) => (
                    <li key={i} className="relative mb-6">
                      <div className="absolute -left-0.5 top-1 w-2 h-2 rounded-full bg-[#2ECC71]" />
                      <div className="flex items-center justify-between">
                        <div className="text-[14px] font-medium text-[#2c3e50]">{log.author}</div>
                        <div className="text-[12px] text-gray-500">{log.time}</div>
                      </div>
                      <div className="mt-1 text-[15px] font-semibold text-[#2c3e50]">{log.title}</div>
                      <p className="mt-1 text-[14px] leading-6 text-gray-700">{log.content}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">❓</div>
                  <p className="text-sm">未知的选项卡</p>
                </div>
              </div>
            )
          )}
        </div>

        {/* 调试按钮：切换回原布局 */}
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setStatus('draft')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            切换回原布局
          </button>
        </div>
      </>
    );
  }

  // 原有布局（当 status !== 'published' 时显示）
  return (
    <>
      <Breadcrumb paths={[{ href: "/projects", label: "我的项目" }, { label: "项目详情" }]} />
      
      {/* 调试按钮：切换到已发布布局 */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setStatus('published')}
          className="bg-[#2ECC71] hover:bg-[#27AE60] text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          切换到已发布布局
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* 左侧主内容区 */}
        <section className="md:col-span-2">
          {/* 项目核心信息 */}
          <h1 className="text-3xl font-extrabold leading-9 text-[#2c3e50]">{project.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={project.owner.name} />
            <div>
              <p className="text-[14px] font-medium text-[#2c3e50]">{project.owner.name}</p>
              <p className="text-[12px] text-[#95a5a6]">项目所有者</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <div className="border-l-4 border-gray-300 pl-4 text-sm text-gray-700">
              <Link href={project.fromIdea.href} className="text-[#3498db] hover:underline">
                源于创意：{project.fromIdea.title}
              </Link>
            </div>
          </div>

          {/* 发布动态入口（模拟） */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label htmlFor="postUpdate" className="block text-sm font-medium text-[#2c3e50]">
              发布项目动态
            </label>
            <textarea
              id="postUpdate"
              rows={4}
              placeholder="有什么新进展？和大家分享一下吧..."
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-[14px] leading-6 focus:border-[#2ECC71] focus:outline-none"
            />
            <div className="mt-3 text-right">
              <button type="button" className="rounded-lg bg-[#2ECC71] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#27AE60]">
                发布动态
              </button>
            </div>
          </div>

          {/* 开发日志时间轴 */}
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2c3e50]">开发日志</h2>
            <ul className="mt-4 space-y-6">
              {/* 日志 1：规划阶段 */}
              <li className="flex items-start gap-3">
                <Avatar name="Zoe" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[14px] font-medium text-[#2c3e50]">Zoe</div>
                    <div className="text-[12px] text-gray-500">3天前</div>
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-[#2c3e50]">项目规划与功能定义 V1.0</div>
                  <p className="mt-1 text-[14px] leading-6 text-gray-700">
                    进行了整体功能范围界定与优先级排序，确定了 MVP 的目标：自动转写、行动项提取与协作平台同步。
                  </p>
                </div>
              </li>
              {/* 日志 2：开发阶段 */}
              <li className="flex items-start gap-3">
                <Avatar name="Ken" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[14px] font-medium text-[#2c3e50]">Ken</div>
                    <div className="text-[12px] text-gray-500">1天前</div>
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-[#2c3e50]">第一周开发进度</div>
                  <p className="mt-1 text-[14px] leading-6 text-gray-700">
                    已完成核心API的开发，下一步将进行前端对接。
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* 右侧信息栏（仪表盘） */}
        <aside className="md:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* 新：项目控制卡片（合并项目阶段 + 发布按钮）*/}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-[16px] font-semibold text-[#2c3e50]">项目控制</h3>
              {/* 阶段进度条 */}
              <div className="flex items-center gap-3">
                <Step icon="💡" label="规划中" state={project.status === "planning" ? "active" : "done"} />
                <div className={`h-0.5 flex-1 ${project.status === "planning" ? "bg-gray-200" : "bg-[#2ECC71]"}`} />
                <Step icon="💻" label="开发中" state={project.status === "developing" ? "active" : project.status === "planning" ? "todo" : "done"} />
                <div className={`h-0.5 flex-1 ${project.status === "internalTesting" || project.status === "released" ? "bg-[#2ECC71]" : "bg-gray-200"}`} />
                <Step icon="📦" label="内测中" state={project.status === "internalTesting" ? "active" : project.status === "released" ? "done" : "todo"} />
                <div className={`h-0.5 flex-1 ${project.status === "released" ? "bg-[#2ECC71]" : "bg-gray-200"}`} />
                <Step icon="✅" label="已发布" state={project.status === "released" ? "active" : "todo"} />
              </div>
            
              {/* 动态操作按钮 */}
              <div className="mt-4">
                {project.status === "internalTesting" ? (
                  <Link 
                    href={`/project/${id}/release`}
                    className="block w-full rounded-xl bg-[#2ECC71] px-5 py-3 text-center text-[16px] font-semibold text-white hover:bg-[#27AE60] transition-colors"
                  >
                    发布最终产品
                  </Link>
                ) : project.status === "released" ? (
                  <div className="w-full rounded-xl bg-gray-100 px-5 py-3 text-center text-[16px] font-semibold text-gray-500">
                    项目已发布 ✅
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="w-full rounded-xl border border-gray-300 px-5 py-2.5 text-[14px] font-semibold text-[#2c3e50] hover:bg-gray-50 transition-colors"
                  >
                    完成当前阶段 →
                  </button>
                )}
              </div>
            </div>
            
            {/* 核心数据仪表盘：保持不变 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <ul className="space-y-3 text-[14px] text-[#2c3e50]">
                <li className="flex items-center justify-between">
                  <span className="text-gray-600">想要用户数</span>
                  <span className="font-semibold">1.5k</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-gray-600">日志更新数</span>
                  <span className="font-semibold">5</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-gray-600">项目浏览量</span>
                  <span className="font-semibold">3.2k</span>
                </li>
              </ul>
            </div>
            
            {/* 移除：原独立发布产品按钮卡片（已并入项目控制卡片）*/}
          </div>
        </aside>
      </div>

      {/* 完成当前阶段：确认弹窗 */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={`确认完成【${currentStageName}】阶段并进入【${nextStageName}】？`}
      >
        <p className="text-[14px] leading-6 text-gray-700">
          进入下一阶段后，项目状态将不可逆。建议您先发布一篇开发日志，同步最新进展。
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#2c3e50] hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirmStageProgress}
            className="rounded-md bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white hover:bg-[#27AE60] transition-colors"
          >
            确认推进
          </button>
        </div>
      </Modal>

      {/* 移除：发布最终产品表单弹窗 */}
      {false && (
        <div />
      )}
    </>
  );
}


