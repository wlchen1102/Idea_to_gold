// 发布新创意页面
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
// import ConfirmationModal from "@/components/ConfirmationModal";
// import Modal from "@/components/Modal";
// import CloseButton from "@/components/CloseButton";
import Breadcrumb from "@/components/Breadcrumb";
import { requireSupabaseClient } from "@/lib/supabase";
import Checkbox from "@/components/ui/Checkbox";
import TextInput from "@/components/ui/TextInput";
import Textarea from "@/components/ui/Textarea";

export default function NewCreativePage() {
  const router = useRouter();
  
  // 表单：受控状态
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState(
    ""
  );
  // 【暂时注释】悬赏金额功能
  // const [bountyEnabled, setBountyEnabled] = useState(false);
  // const [bountyAmount, setBountyAmount] = useState<string>("500");
  const platformOptions = [
    { id: "web", label: "网页" },
    { id: "mini", label: "小程序" },
    { id: "ios", label: "iOS" },
    { id: "android", label: "安卓" },
    { id: "win", label: "Windows" },
    { id: "mac", label: "Mac" },
  ] as const;
  const [expectedTargets, setExpectedTargets] = useState<Record<string, boolean>>({
    web: true,
    mini: false,
    ios: false,
    android: false,
    win: false,
    mac: false,
  });

  // 提交状态
  const [submitting, setSubmitting] = useState(false);

  // 【暂时注释】侧边栏：模拟 API 请求
  // const presetSuggestions = [
  //   { id: "s1", score: 0.85, title: "AI 会议记录与行动项提取" },
  //   { id: "s2", score: 0.78, title: "语音转写 + 摘要助手（支持多语）" },
  //   { id: "s3", score: 0.73, title: "企业版会议纪要机器人（接入钉钉/企微）" },
  // ];
  // const [aiLoading, setAiLoading] = useState(false);
  // const [aiSuggestions, setAiSuggestions] = useState<
  //   { id: string; score: number; title: string }[]
  // >([]);
  // const [showConfirm, setShowConfirm] = useState(false);
  // 【暂时注释】AI副驾侧边栏显示控制（默认隐藏）
  // const [showAISidebar, setShowAISidebar] = useState(false);
  // 【暂时注释】AI 对话模拟数据
  // const [chatMessages, setChatMessages] = useState<
  //   { id: string; role: "ai" | "user"; text: string }[]
  // >([
  //   { id: "m1", role: "ai", text: "太棒了！请用一句话告诉我你最初的想法是什么？" },
  //   { id: "m2", role: "user", text: "我想做一个能自动弄会议纪要的工具。" },
  //   { id: "m3", role: "ai", text: "好的，你认为它最关键的价值是什么？" },
  //   { id: "m4", role: "user", text: "帮团队更快对齐待办，并同步到协作工具。" },
  //   { id: "m5", role: "ai", text: "明白了，你打算先从哪个场景开始？" },
  // ]);
  // 聊天输入框与发送
  // const [chatInput, setChatInput] = useState("");
  // function handleSend() {
  //   const text = chatInput.trim();
  //   if (!text) return;
  //   setChatMessages((prev) => [...prev, { id: `u${Date.now()}`, role: "user", text }]);
  //   setChatInput("");
  //   setTimeout(() => {
  //     setChatMessages((prev) => [
  //       ...prev,
  //       { id: `a${Date.now()}`, role: "ai", text: "收到！我会继续帮你梳理。" },
  //     ]);
  //   }, 600);
  // }

  // 处理表单提交的真实API调用
  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      // 检查登录：需要有效的 Supabase 会话
      const supabase = requireSupabaseClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        localStorage.setItem('pendingToast', '请先登录后再发布创意');
        window.dispatchEvent(new Event('localToast'));
        setSubmitting(false);
        // setShowConfirm(false);
        router.push('/login');
        return;
      }

      // 构建请求数据（author_id 不再从前端传，后端根据 token 中的 user.id 设置）
      const requestData = {
        title: title.trim(),
        description: desc.trim(),
        terminals: Object.keys(expectedTargets).filter(key => expectedTargets[key]),
        // 【暂时注释】悬赏金额功能
        // bounty_amount: bountyEnabled ? Math.max(0, parseInt(bountyAmount || '0', 10) || 0) : 0,
        bounty_amount: 0,
      };

      // 向 /api/creatives 发送 POST 请求，添加 Authorization 头
      const response = await fetch('/api/creatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        // 成功：显示成功提示并跳转到首页
        localStorage.setItem("pendingToast", "恭喜！您的创意已成功发布！");
        window.dispatchEvent(new Event("localToast"));
        
        // 短暂延迟后跳转到首页
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        // 失败：显示错误提示，停留在当前页面
        const errorData = await response.json().catch(() => ({}));
        const detail = (errorData as { error?: string; message?: string })?.error || (errorData as { error?: string; message?: string })?.message || '未知错误';
        localStorage.setItem("pendingToast", `发布失败：${detail}`);
        window.dispatchEvent(new Event("localToast"));
      }
    } catch (error) {
      // 网络错误等异常
      const err = error as Error;
      console.error('提交创意时发生错误:', err);
      localStorage.setItem("pendingToast", `发布失败：${err?.message || '网络错误，请稍后重试'}`);
      window.dispatchEvent(new Event("localToast"));
    } finally {
      setSubmitting(false);
      // setShowConfirm(false);
    }
  };

  // 【暂时注释】相似创意显示控制：默认隐藏，textarea 失焦 3 秒后显示
  // const [showSimilar, setShowSimilar] = useState(false);
  // const [similarLoading, setSimilarLoading] = useState(false);
  // const similarTimerRef = useRef<number | null>(null);
  // 点子详情 textarea 引用，用于自适应高度
  const descRef = useRef<HTMLTextAreaElement>(null);
  // 【暂时注释】预览弹窗控制
  // const [isPreviewOpen, setPreviewOpen] = useState(false);
  // 自适应高度：随内容增高，最多 16 行，超过后滚动
  function autoResizeDesc() {
    const el = descRef.current;
    if (!el) return;
    const maxLines = 16;         // 最多展示 16 行
    const lineHeight = 24;       // 与 class `leading-6` 对应 24px 行高
    const verticalPadding = 24;  // 与 class `p-3` 对应上下各 12px，总计 24px
    const maxHeight = maxLines * lineHeight + verticalPadding;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }
  useEffect(() => {
    autoResizeDesc();
  }, [desc]);
  useEffect(() => {
    autoResizeDesc();
  }, []);
  // 【暂时注释】相似创意定时器清理
  // useEffect(() => {
  //   return () => {
  //     if (similarTimerRef.current) {
  //       clearTimeout(similarTimerRef.current);
  //     }
  //   };
  // }, []);

  return (
    <>
      <Breadcrumb paths={[{ href: "/", label: "创意广场" }, { label: "发布新创意" }]} />
      {/* 【暂时注释】动态布局支持AI侧边栏 */}
      {/* <div className={`grid grid-cols-1 gap-6 ${showAISidebar ? "md:grid-cols-3" : ""}`}> */}
      <div className="grid grid-cols-1 gap-6">
        {/* 左侧：表单（保持固定宽度，避免因隐藏侧栏导致整体变宽） */}
        {/* <section className={`${showAISidebar ? "md:col-span-2 md:mx-0" : "mx-auto max-w-2xl"}`}> */}
        <section className="mx-auto max-w-2xl">
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold leading-9 text-[#2c3e50]">分享你的绝妙创意</h1>
            <p className="mt-2 text-[#95a5a6]">一个好的创意，是改变世界的开始</p>
          </header>

          <form className="space-y-6">
            {/* 标题 */}
            <div>
              <TextInput
                id="title"
                label="标题"
                placeholder="一句话说清你的点子，如：一个能自动总结会议纪要的AI工具"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* 点子详情 */}
            <div>
              <Textarea
                id="desc"
                label="点子详情"
                rows={5}
                placeholder="详细描述你的创意、目标用户、场景与可行性..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                autoResize
              />
            </div>

            {/* 期望终端 */}
            <div>
              <span className="block text-sm font-medium text-[#2c3e50]">期望终端</span>
              <div className="mt-3 flex flex-wrap gap-3">
                {platformOptions.map((opt) => (
                  <Checkbox
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    wrapperClassName="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    checked={Boolean(expectedTargets[opt.id])}
                    onChange={(e) =>
                      setExpectedTargets((prev) => ({ ...prev, [opt.id]: (e.target as HTMLInputElement).checked }))
                    }
                  />
                ))}
              </div>
            </div>

            {/* 【暂时注释】悬赏金额 */}
            {/* <div>
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
                    value={bountyAmount}
                    onChange={(e) => setBountyAmount(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-3 text-[14px] focus:border-[#2ECC71] focus:outline-none"
                  />
                </div>
              )}
            </div> */}

            {/* 发布按钮 */}
            <div className="pt-2">
              <button
                type="button"
                // 【暂时注释】使用确认弹窗
                // onClick={() => setShowConfirm(true)}
                onClick={handleSubmit}
                disabled={submitting}
                className={`w-full rounded-lg px-6 py-3 text-[16px] font-semibold text-white ${
                  submitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#2ECC71] hover:bg-[#27AE60]"
                }`}
              >
                {submitting ? "发布中..." : "发布创意"}
              </button>
            </div>
          </form>
        </section>

        {/* 【暂时注释】右侧：AI副驾侧边栏（默认隐藏，点击触发后显示） */}
        {/* {showAISidebar && (
          <aside className="md:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F1C40F" strokeWidth="2" className="h-5 w-5">
                    <path d="M9 18h6M12 2v4m8 6h-4m-8 0H4m11.31-6.31 2.83 2.83M5.86 5.86l2.83 2.83" />
                  </svg>
                  <h2 className="text-[16px] font-semibold text-[#2c3e50]">猫神AI</h2>
                  <CloseButton className="ml-auto" onClick={() => setShowAISidebar(false)} />
                </div>
                <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                  {chatMessages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ecf0f1] text-sm">
                          {m.role === "ai" ? "🤖" : "我"}
                        </div>
                        <div
                          className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                            m.role === "ai"
                              ? "bg-gray-100 text-[#2c3e50]"
                              : "bg-[#2ECC71] text-white"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ecf0f1] text-sm">🤖</div>
                      <div className="max-w-[80%] space-y-3">
                        <div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm leading-6 text-[#2c3e50]">
                          感谢你的回答！根据我们的沟通，我为你整理出了一份清晰的需求说明，请确认一下：
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-[#2c3e50]">
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium">【一句话标题】</span>：AI会议纪要与行动项提取助手
                            </div>
                            <div>
                              <span className="font-medium">【目标用户】</span>：小团队管理者
                            </div>
                            <div>
                              <span className="font-medium">【核心痛点】</span>：整理纪要耗时耗力
                            </div>
                            <div>
                              <span className="font-medium">【核心功能】</span>：自动转写、行动项提取、同步到协作工具
                            </div>
                            <div>
                              <span className="font-medium">【MVP范围】</span>：会议录音 → 转写 → 行动项 → 推送
                            </div>
                            <div>
                              <span className="font-medium">【预期终端】</span>：网页、Mac
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => {
                              const newTitle = "AI会议纪要与行动项提取助手";
                              const newDesc = [
                                "【目标用户】: 小团队管理者",
                                "【核心痛点】: 整理纪要耗时耗力",
                                "【核心功能】: 自动转写、行动项提取、同步到协作工具",
                                "【MVP范围】: 会议录音 → 转写 → 行动项 → 推送",
                                "【预期终端】: 网页、Mac",
                              ].join("\n");
                              setTitle(newTitle);
                              setDesc(newDesc);
                              setExpectedTargets((prev) => ({ ...prev, web: true, mac: true }));
                            }}
                            className="w-full rounded-lg bg-[#2ECC71] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#27AE60]"
                          >
                            👍 完美，填充到左侧表单
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="输入你的问题..."
                    className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-[#2ECC71] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="rounded-md bg-[#2ECC71] px-3 py-2 text-sm font-semibold text-white hover:bg-[#27AE60]"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )} */}
      </div>
      {/* 【暂时注释】发布确认弹窗 */}
      {/* <ConfirmationModal
        isOpen={showConfirm}
        similar={{
          id: (aiSuggestions[0] ?? presetSuggestions[0]).id,
          title: (aiSuggestions[0] ?? presetSuggestions[0]).title,
          score: (aiSuggestions[0] ?? presetSuggestions[0]).score,
          href: `/idea/${(aiSuggestions[0] ?? presetSuggestions[0]).id}`,
        }}
        onClose={() => setShowConfirm(false)}
        onContinue={handleSubmit}
      /> */}
      {/* 【暂时注释】相似创意预览弹窗 */}
      {/* <Modal isOpen={isPreviewOpen} onClose={() => setPreviewOpen(false)} title="AI会议记录与行动项提取">
        <div className="space-y-3 text-[14px] leading-6 text-[#2c3e50]">
          <p>
            这是一个用于演示的创意预览内容。它能够自动识别会议中的关键结论与行动项，支持多语种转写与摘要，
            并可以与主流协作工具进行无缝同步，帮助团队更快对齐待办、降低沟通成本。
          </p>
          <p>
            功能预览：语音转写、要点提取、行动项识别、提醒与推送、与第三方应用集成（如飞书、钉钉、Slack）。
          </p>
          <div className="rounded-md bg-gray-50 p-3 text-[13px] text-gray-700">已有856人想要</div>
        </div>
        <div className="mt-5 text-right">
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-[14px] font-medium text-[#2c3e50] hover:bg-gray-50"
          >
            关闭
          </button>
        </div>
      </Modal> */}
    </>
  );
}


