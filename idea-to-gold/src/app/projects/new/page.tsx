// 创建新项目页面
"use client";

import Breadcrumb from "@/components/Breadcrumb";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 模拟项目创建并跳转
  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 模拟项目创建过程（例如生成ID、保存数据等）
    const mockProjectId = Math.floor(Math.random() * 1000) + 1; // 生成1-1000的随机ID
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 跳转到新创建的项目详情页
    router.push(`/projects/${mockProjectId}`);
  };

  return (
    <>
      {/* 面包屑放在网格外部，确保右侧卡片与左侧标题（网格内顶部）对齐 */}
      <Breadcrumb paths={[{ href: "/projects", label: "我的项目" }, { label: "创建新项目" }]} />

      {/* 双栏布局容器（遵循全局 main 的宽度与内边距，不再额外添加 max-w 或 mx-auto）*/}
      <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* 左侧主内容区：约 2/3 宽（md 及以上）*/}
        <div className="md:col-span-2 space-y-6">
          {/* 标题区域保持在网格内顶部，确保与右侧卡片顶部对齐 */}
          <header>
            <h1 className="text-3xl font-extrabold leading-9 text-[#2c3e50]">为你的新项目立项</h1>
            <p className="mt-2 text-[#95a5a6]">迈出从0到1的第一步，世界将因此而不同</p>
          </header>

          {/* 立项表单卡片（统一样式：白底、圆角、内边距、轻微阴影）*/}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <form className="space-y-6" onSubmit={handleCreateProject}>
              {/* 项目名称 */}
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-[#2c3e50]">
                  项目名称
                </label>
                <input
                  id="projectName"
                  type="text"
                  required
                  placeholder="给你的项目起个响亮的名字吧！"
                  className="mt-2 w-full rounded-md border border-gray-300 p-3 text-[14px] focus:border-[#2ECC71] focus:outline-none"
                />
              </div>

              {/* 项目简介 */}
              <div>
                <label htmlFor="projectIntro" className="block text-sm font-medium text-[#2c3e50]">
                  项目简介
                </label>
                <textarea
                  id="projectIntro"
                  rows={5}
                  required
                  placeholder="简要描述你的实现思路或项目亮点"
                  className="mt-2 w-full rounded-md border border-gray-300 p-3 text-[14px] leading-6 focus:border-[#2ECC71] focus:outline-none"
                />
              </div>

              {/* 初始状态 */}
              <div>
                <span className="block text-sm font-medium text-[#2c3e50]">初始状态</span>
                <div className="mt-3 flex items-center gap-6 text-sm text-gray-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value="planning"
                      defaultChecked
                      className="h-4 w-4 border-gray-300 text-[#2ECC71] focus:ring-[#2ECC71]"
                    />
                    规划中
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value="developing"
                      className="h-4 w-4 border-gray-300 text-[#2ECC71] focus:ring-[#2ECC71]"
                    />
                    开发中
                  </label>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="block w-full rounded-lg bg-[#2ECC71] px-6 py-3 text-center text-[16px] font-semibold text-white hover:bg-[#27AE60] disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "创建中..." : "创建项目"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 右侧信息栏：约 1/3 宽（md 及以上）。用于展示关联创意详情（模拟数据）*/}
        <aside className="md:col-span-1">
          <div className="sticky top-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-lg font-semibold text-[#2c3e50]">关联创意详情</h2>

            {/* 创意标题 */}
            <h3 className="mt-3 text-base font-bold text-gray-900">一个能自动总结会议纪要的AI工具</h3>

            {/* 创意描述（模拟数据）*/}
            <p className="mt-2 text-sm leading-6 text-gray-700">
              基于语音转文字与大语言模型的要点提取能力，自动生成会议纪要、行动项与责任人；支持多端同步与检索，降低沟通成本，提高协作效率。
            </p>

            {/* 关联创意链接（采用项目详情“源于创意”样式）*/}
            <div className="mt-6 rounded-xl bg-gray-50 p-4">
              <div className="border-l-4 border-gray-300 pl-4 text-sm text-gray-700">
                <Link href="/idea/1" className="text-[#3498db] hover:underline">
                  源于创意：一个能自动总结会议纪要的AI工具
                </Link>
              </div>
            </div>

            {/* 关键数据（上下排列）*/}
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-gray-500">想要人数</div>
                <div className="mt-1 text-base font-semibold text-gray-900">1.5k</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-gray-500">期望终端</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Web</span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">iOS</span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Android</span>
                </div>
              </div>
            </div>

            {/* 其他信息（可扩展）*/}
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              注：以上为演示数据，实际会根据选择的创意自动关联。
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}


