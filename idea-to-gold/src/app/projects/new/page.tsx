import Breadcrumb from "@/components/Breadcrumb";
import Link from "next/link";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <Breadcrumb paths={[{ href: "/projects", label: "我的项目" }, { label: "创建新项目" }]} />
      {/* 标题区域 */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold leading-9 text-[#2c3e50]">为你的新项目立项</h1>
        <p className="mt-2 text-[#95a5a6]">迈出从0到1的第一步，世界将因此而不同</p>
      </header>

      {/* 关联创意引用区 */}
      <section className="mb-8">
        <div className="rounded-xl bg-gray-50 p-4">
          <div className="border-l-4 border-gray-300 pl-4 text-sm text-gray-700">
            <Link
              href="/idea/1/ai-会议记录与行动项提取"
              className="text-[#3498db] hover:underline"
            >
              关联创意：一个能自动总结会议纪要的AI工具
            </Link>
          </div>
        </div>
      </section>

      {/* 核心表单 */}
      <form className="space-y-6">
        {/* 项目名称 */}
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-[#2c3e50]">
            项目名称
          </label>
          <input
            id="projectName"
            type="text"
            placeholder="给你的项目起个响亮的名字吧！"
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-[14px] focus:border-[#2ECC71] focus:outline-none"
          />
        </div>

        {/* 一句话简介 */}
        <div>
          <label htmlFor="projectIntro" className="block text-sm font-medium text-[#2c3e50]">
            一句话简介
          </label>
          <textarea
            id="projectIntro"
            rows={5}
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
          <Link
            href="/projects"
            className="block w-full rounded-lg bg-[#2ECC71] px-6 py-3 text-center text-[16px] font-semibold text-white hover:bg-[#27AE60]"
          >
            创建项目
          </Link>
        </div>
      </form>
    </div>
  );
}


