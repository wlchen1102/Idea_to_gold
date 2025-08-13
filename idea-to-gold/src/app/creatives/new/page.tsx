"use client";

import { useState } from "react";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function NewCreativePage() {
  const [bountyEnabled, setBountyEnabled] = useState(false);
  const suggestions = [
    { id: "s1", score: 0.85, title: "AI 会议记录与行动项提取" },
    { id: "s2", score: 0.78, title: "语音转写 + 摘要助手（支持多语）" },
    { id: "s3", score: 0.73, title: "企业版会议纪要机器人（接入钉钉/企微）" },
  ];
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* 左侧：表单 */}
        <section className="md:col-span-2">
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold leading-9 text-[#2c3e50]">分享你的绝妙创意</h1>
            <p className="mt-2 text-[#95a5a6]">一个好的创意，是改变世界的开始</p>
          </header>

          <form className="space-y-6">
        {/* 标题 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[#2c3e50]">
            标题
          </label>
          <input
            id="title"
            type="text"
            placeholder="一句话说清你的点子，如：一个能自动总结会议纪要的AI工具"
            defaultValue="AI 会议纪要助手"
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-[14px] focus:border-[#2ECC71] focus:outline-none"
          />
        </div>

        {/* 详细描述 */}
        <div>
          <label htmlFor="desc" className="block text-sm font-medium text-[#2c3e50]">
            详细描述
          </label>
          <textarea
            id="desc"
            rows={8}
            placeholder="详细描述你的创意、目标用户、场景与可行性..."
            defaultValue={
              "它能够自动整理会议纪要、抽取待办事项，并将关键结论同步到协作工具中，适合远程团队和忙碌的管理者。"
            }
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-[14px] leading-6 focus:border-[#2ECC71] focus:outline-none"
          />
        </div>

        {/* 期望终端 */}
        <div>
          <span className="block text-sm font-medium text-[#2c3e50]">期望终端</span>
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              { id: "web", label: "网页", checked: true },
              { id: "mini", label: "小程序" },
              { id: "ios", label: "iOS" },
              { id: "android", label: "安卓" },
              { id: "win", label: "Windows" },
              { id: "mac", label: "Mac" },
            ].map((opt) => (
              <label
                key={opt.id}
                htmlFor={opt.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <input id={opt.id} type="checkbox" defaultChecked={Boolean(opt.checked)} className="h-4 w-4 rounded border-gray-300 text-[#2ECC71] focus:ring-[#2ECC71]" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* 悬赏金额 */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="bounty" className="block text-sm font-medium text-[#2c3e50]">
              悬赏金额 (可选)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={bountyEnabled}
                onChange={(e) => setBountyEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#2ECC71] focus:ring-[#2ECC71]"
              />
              开启悬赏
            </label>
          </div>
          {bountyEnabled && (
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-gray-500">￥</span>
              <input
                id="bounty"
                type="number"
                min={0}
                placeholder="例如：500"
                defaultValue={500}
                className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-3 text-[14px] focus:border-[#2ECC71] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* 发布按钮 */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="w-full rounded-lg bg-[#2ECC71] px-6 py-3 text-[16px] font-semibold text-white hover:bg-[#27AE60]"
          >
            发布创意
          </button>
        </div>
          </form>
        </section>

        {/* 右侧：AI副驾侧边栏 */}
        <aside className="md:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                {/* 魔法棒/灯泡图标 */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F1C40F" strokeWidth="2" className="h-5 w-5">
                  <path d="M9 18h6M12 2v4m8 6h-4m-8 0H4m11.31-6.31 2.83 2.83M5.86 5.86l2.83 2.83" />
                </svg>
                <h2 className="text-[16px] font-semibold text-[#2c3e50]">AI副驾</h2>
              </div>
              {/* 加载状态 */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                正在思考中...
              </div>

              {/* 结果展示区 */}
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-medium text-[#2c3e50]">看看这些相似的点子？</h3>
                <ul className="space-y-3">
                  {suggestions.map((s) => (
                    <li key={s.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="text-[12px] text-gray-500">相似度: {(s.score * 100).toFixed(0)}%</div>
                      <div className="mt-1 text-[14px] font-medium text-[#2c3e50]">{s.title}</div>
                      <a href="#" className="mt-1 inline-block text-[13px] text-[#3498db] hover:underline">查看详情</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <ConfirmationModal
        isOpen={showConfirm}
        similar={{ id: suggestions[0].id, title: suggestions[0].title, score: suggestions[0].score, href: `/idea/1/ai-会议记录与行动项提取` }}
        onClose={() => setShowConfirm(false)}
        onMerge={() => {
          setShowConfirm(false);
          // 写入跨页通信：toast + 评论注入
          localStorage.setItem("pendingToast", "已将您的描述自动添加到评论区");
          const desc = (document.getElementById("desc") as HTMLTextAreaElement)?.value || "";
          localStorage.setItem("pendingComment:1", desc);
          localStorage.setItem("pendingSupport:1", "1");
          // 跳转到相似点子详情（示例 id=1，实际可根据相似项）
          window.location.href = `/idea/1/ai-会议记录与行动项提取`;
        }}
        onContinue={() => {
          setShowConfirm(false);
          localStorage.setItem("pendingToast", "已发布成功");
          // 先显示 toast，再在 1200ms 后返回首页
          setTimeout(() => {
            window.location.href = "/";
          }, 1200);
        }}
      />
    </div>
  );
}


