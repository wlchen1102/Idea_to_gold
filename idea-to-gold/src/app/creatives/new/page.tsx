"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmationModal from "@/components/ConfirmationModal";
import Modal from "@/components/Modal";
import CloseButton from "@/components/CloseButton";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/lib/supabase";

export default function NewCreativePage() {
  const router = useRouter();
  
  // 表单：受控状态
  const [title, setTitle] = useState("AI 会议纪要助手");
  const [desc, setDesc] = useState(
    "它能够自动整理会议"
  );
  const [bountyEnabled, setBountyEnabled] = useState(false);
  const [bountyAmount, setBountyAmount] = useState<string>("500");
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

  // 侧边栏：模拟 API 请求
  const presetSuggestions = [
    { id: "s1", score: 0.85, title: "AI 会议记录与行动项提取" },
    { id: "s2", score: 0.78, title: "语音转写 + 摘要助手（支持多语）" },
    { id: "s3", score: 0.73, title: "企业版会议纪要机器人（接入钉钉/企微）" },
  ];
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    { id: string; score: number; title: string }[]
  >([]);
  const [showConfirm, setShowConfirm] = useState(false);
  // 新增：AI副驾侧边栏显示控制（默认隐藏）
  const [showAISidebar, setShowAISidebar] = useState(false);
  // 新增：AI 对话模拟数据
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: "ai" | "user"; text: string }[]
  >([
    { id: "m1", role: "ai", text: "太棒了！请用一句话告诉我你最初的想法是什么？" },
    { id: "m2", role: "user", text: "我想做一个能自动弄会议纪要的工具。" },
    { id: "m3", role: "ai", text: "好的，你认为它最关键的价值是什么？" },
    { id: "m4", role: "user", text: "帮团队更快对齐待办，并同步到协作工具。" },
    { id: "m5", role: "ai", text: "明白了，你打算先从哪个场景开始？" },
  ]);
  // 聊天输入框与发送
  const [chatInput, setChatInput] = useState("");
  function handleSend() {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [...prev, { id: `u${Date.now()}`, role: "user", text }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { id: `a${Date.now()}`, role: "ai", text: "收到！我会继续帮你梳理。" },
      ]);
    }, 600);
  }

  // 处理表单提交的真实API调用
  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      // 使用 Supabase 获取当前会话的 access_token，用于调用后端鉴权
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        // 未登录，提示并跳转登录
        localStorage.setItem('pendingToast', '请先登录后再发布创意');
        window.dispatchEvent(new Event('localToast'));
        setSubmitting(false);
        setShowConfirm(false);
        router.push('/login');
        return;
      }

      // 构建请求数据，后端将从 JWT 中提取 author_id，因此不再传递 author_id
      const requestData = {
        title: title.trim(),
        description: desc.trim(),
        terminals: Object.keys(expectedTargets).filter(key => expectedTargets[key]),
        bounty_amount: bountyEnabled ? Math.max(0, parseInt(bountyAmount || '0', 10) || 0) : 0,
      };

      // 向 /api/creatives 发送 POST 请求，并携带 Authorization 头
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
        const errorData = await response.json().catch(() => ({} as any));
        const detail = errorData?.error || errorData?.message || '未知错误';
        localStorage.setItem("pendingToast", `发布失败：${detail}`);
        window.dispatchEvent(new Event("localToast"));
      }
    } catch (error: any) {
      // 网络错误等异常
      console.error('提交创意时发生错误:', error);
      localStorage.setItem("pendingToast", `发布失败：${error?.message || '网络错误，请稍后重试'}`);
      window.dispatchEvent(new Event("localToast"));
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  // 相似创意显示控制：默认隐藏，textarea 失焦 3 秒后显示
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const similarTimerRef = useRef<number | null>(null);
  // 点子详情 textarea 引用，用于自适应高度
  const descRef = useRef<HTMLTextAreaElement>(null);
  // 预览弹窗控制
  const [isPreviewOpen, setPreviewOpen] = useState(false);
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
  useEffect(() => {
    return () => {
      if (similarTimerRef.current) {
        clearTimeout(similarTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <Breadcrumb paths={[{ href: "/", label: "创意广场" }, { label: "发布新创意" }]} />
      <div className={`grid grid-cols-1 gap-6 ${showAISidebar ? "md:grid-cols-3" : ""}`}>
        {/* 左侧：表单（保持固定宽度，避免因隐藏侧栏导致整体变宽） */}
        <section className={`${showAISidebar ? "md:col-span-2 md:mx-0" : "mx-auto max-w-2xl"}`}>
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 bg-white p-3 text-[14px] focus:border-[#2ECC71] focus:outline-none"
              />
            </div>

            {/* 点子详情 */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="desc" className="block text-sm font-medium text-[#2c3e50]">
                  点子详情
                </label>
                <button
                  type="button"
                  onClick={() => desc.length > 10 && setShowAISidebar(true)}
                  className={`text-xs font-medium ${desc.length > 10 ? "text-[#3498db] hover:underline" : "text-gray-400 cursor-not-allowed"}`}
                  disabled={desc.length <= 10}
                >
                  ✨ 让AI帮我梳理需求
                </button>
              </div>
              <textarea
                id="desc"
                rows={5}
                placeholder="详细描述你的创意、目标用户、场景与可行性..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onFocus={() => {
                  if (similarTimerRef.current) clearTimeout(similarTimerRef.current);
                  setShowSimilar(false);
                  setSimilarLoading(false);
                }}
                onBlur={() => {
                  if (similarTimerRef.current) clearTimeout(similarTimerRef.current);
                  setShowSimilar(false);
                  setSimilarLoading(true);
                  similarTimerRef.current = window.setTimeout(() => {
                    setSimilarLoading(false);
                    setShowSimilar(true);
                  }, 3000);
                }}
                ref={descRef}
                className="mt-2 w-full rounded-md border border-gray-300 bg-white p-3 text-[14px] leading-6 focus:border-[#2ECC71] focus:outline-none resize-none"
              />
              {/* 相似创意推荐（描述失焦后先加载动画，3秒后展示） */}
              {similarLoading && (
                <div className="relative mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <CloseButton
                    size="sm"
                    className="absolute right-3 top-3"
                    onClick={() => {
                      if (similarTimerRef.current) clearTimeout(similarTimerRef.current);
                      setSimilarLoading(false);
                      setShowSimilar(false);
                    }}
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    正在为你查找相似创意...
                  </div>
                </div>
              )}
              {showSimilar && !similarLoading && (
                <div className="relative mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <CloseButton
                    size="sm"
                    className="absolute right-3 top-3"
                    onClick={() => {
                      if (similarTimerRef.current) clearTimeout(similarTimerRef.current);
                      setShowSimilar(false);
                    }}
                  />
                  <h3 className="mb-3 text-sm font-medium text-[#2c3e50]">我们好发现了一些相似创意~</h3>
                  <ul className="space-y-3">
                    {presetSuggestions.slice(0, 3).map((s) => (
                      <li key={s.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[12px] text-gray-500">相似度: {(s.score * 100).toFixed(0)}%</div>
                            <button
                              type="button"
                              onClick={() => setPreviewOpen(true)}
                              className="mt-1 text-left text-[14px] font-medium text-[#2c3e50] hover:underline"
                              title="点击预览详情"
                            >
                              {s.title}
                            </button>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md bg-[#2ECC71] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#27AE60]"
                            onClick={() => {
                              localStorage.setItem("pendingToast", "已将您的描述自动添加到评论区");
                              localStorage.setItem("pendingComment:1", desc);
                              localStorage.setItem("pendingSupport:1", "1");
                              window.location.href = "/idea/1/ai-会议记录与行动项提取";
                            }}
                          >
                            <span>👍</span>
                            <span>合并进去并+1</span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 期望终端选择 */}
            <div>
              <span className="block text-sm font-medium text-[#2c3e50]">期望终端</span>
              <div className="mt-3 flex flex-wrap gap-3">
                {platformOptions.map((opt) => (
                  <label
                    key={opt.id}
                    htmlFor={opt.id}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <input
                      id={opt.id}
                      type="checkbox"
                      checked={Boolean(expectedTargets[opt.id])}
                      onChange={(e) =>
                        setExpectedTargets((prev) => ({ ...prev, [opt.id]: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-[#2ECC71] focus:ring-[#2ECC71]"
                    />
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
                    value={bountyAmount}
                    onChange={(e) => setBountyAmount(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-3 text-[14px] focus:border-[#2ECC71] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* 发布按钮 */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
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

        {/* 右侧：AI副驾与相似创意区域 */}
        {/* ... 其余 UI 代码保持不变 ... */}
      </div>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onContinue={handleSubmit}
      />
    </>
  );
}


