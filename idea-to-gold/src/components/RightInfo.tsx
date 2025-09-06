/**
 * 组件名称：RightInfo
 * 文件作用：用于创意详情页右侧信息面板，展示「我也要」支持按钮、
 *           「正在进行的项目/已发布产品」复合卡片（含占位假数据）、
 *           以及期望终端等信息。并提供跳转到新建项目与发布产品页面的入口。
 * 重要说明：
 * - 运行环境为 Next.js Edge Runtime（SSR 边缘渲染）。
 * - 从创意页跳转：新建项目使用 idea_id 作为查询参数；发布产品使用 from_creative。
 *   以确保对应页面的面包屑导航能正确显示用户来源。
 */
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

// 轻量 toast（无外部依赖）
function toast(message: string) {
  if (typeof window === "undefined") return;
  const id = "__mini_toast__";
  let box = document.getElementById(id);
  if (!box) {
    box = document.createElement("div");
    box.id = id;
    box.style.position = "fixed";
    box.style.top = "20px";
    box.style.left = "50%";
    box.style.transform = "translateX(-50%)";
    box.style.zIndex = "9999";
    box.style.padding = "10px 14px";
    box.style.borderRadius = "8px";
    box.style.background = "rgba(0,0,0,0.8)";
    box.style.color = "#fff";
    box.style.fontSize = "14px";
    box.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.style.opacity = "1";
  setTimeout(() => {
    if (!box) return;
    box.style.transition = "opacity .3s ease";
    box.style.opacity = "0";
  }, 1800);
}

export default function RightInfo({
  supporters,
  platforms: _platforms,
  bounty: _bounty,
  ideaId,
  initialUpvoteData,
}: {
  supporters: number;
  platforms: string[];
  bounty: number;
  ideaId?: string;
  initialUpvoteData?: { upvote_count: number; supported: boolean } | null;
}) {
  const pathname = usePathname();
  const { token, userId } = useAuth();
  const [supported, setSupported] = useState(false);
  const [count, setCount] = useState(supporters);

  // 新增：跟踪"当前是否已支持"的期望状态 & 当前在途请求控制器
  const desiredRef = useRef<boolean>(false);
  const controllerRef = useRef<AbortController | null>(null);
  // 新增：标记用户是否已经与按钮交互过，一旦交互过，就不再让首屏 GET 结果覆盖当前 UI
  const interactedRef = useRef<boolean>(false);

  // 新增：首屏初始化真实的点赞数量与当前用户支持状态
  useEffect(() => {
    if (!ideaId) return;
    
    // 如果有服务端传入的初始数据，直接使用，避免重复请求
    if (initialUpvoteData) {
      setCount(initialUpvoteData.upvote_count);
      setSupported(initialUpvoteData.supported);
      desiredRef.current = initialUpvoteData.supported;
      
      // 与本地缓存对齐（便于后续页面秒显）
      if (userId) {
        const cacheKey = `supported:${userId}:${ideaId}`;
        if (initialUpvoteData.supported) {
          localStorage.setItem(cacheKey, "1");
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
      return;
    }
    
    let cancelled = false;

    async function load() {
      try {
        // 1) 先用本地缓存加速"已想要"的首屏显示（减少等待）
        if (userId) {
          const cacheKey = `supported:${userId}:${ideaId}`;
          if (localStorage.getItem(cacheKey) === "1") {
            setSupported(true);
            desiredRef.current = true;
            // 临时兜底：若首屏人数为0但用户已支持，先显示至少1人，待GET返回再对齐
            setCount((prev) => (prev <= 0 ? 1 : prev));
          }
        }

        // 2) 再请求服务端以"真实结果"对齐（若与本地缓存不一致，会以服务端为准）
        const resp = await fetch(`/api/creatives/${ideaId}/upvote`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          // count 可缓存，但 supported 受用户影响，这里依旧采用默认，避免错误缓存
        });
        const json: { upvote_count?: number; supported?: boolean } | null = await resp
          .json()
          .catch(() => null);

        if (!resp.ok) {
          console.warn("Init upvote fetch failed:", json);
          return;
        }
        if (cancelled) return;
        // 若用户在首屏请求期间已经点击过按钮，则认为首屏结果已过期，避免覆盖当前 UI
        if (interactedRef.current) return;

        const initCount = json?.upvote_count ?? supporters;
        const initSupported = Boolean(json?.supported);
        setCount(Number(initCount) || 0);
        setSupported(initSupported);
        desiredRef.current = initSupported;

        // 与本地缓存对齐（便于后续页面秒显）
        if (userId) {
          const cacheKey = `supported:${userId}:${ideaId}`;
          if (initSupported) localStorage.setItem(cacheKey, "1");
          else localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        console.warn("Init upvote error:", e);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ideaId, supporters, pathname, initialUpvoteData, token, userId]);

  // 点赞/取消点赞：改为“最后一次点击生效”，会中止上一次在途请求
  async function handleSupport() {
    if (!ideaId) return;

    // 修正：以"期望状态"为基准翻转，避免多次快速点击时使用到过期的 supported 值
    const nextSupported = !desiredRef.current; // 本次点击后的期望状态

    try {
      if (!token) {
        toast("请先登录");
        window.location.assign("/login");
        return;
      }

      // 标记：用户已交互，后续不允许首屏 GET 覆盖 UI
      interactedRef.current = true;

      // 1) 立刻 optimistic 更新（UI 秒变）；并记录期望状态
      setSupported(nextSupported);
      setCount((c) => (nextSupported ? c + 1 : Math.max(0, c - 1)));
      desiredRef.current = nextSupported;

      // 2) 中止上一次在途请求
      if (controllerRef.current) {
        try { controllerRef.current.abort('superseded'); } catch { /* ignore */ }
      }
      const controller = new AbortController();
      controllerRef.current = controller;

      // 3) 发起与期望状态一致的请求
      const method = nextSupported ? "POST" : "DELETE";
      const resp = await fetchWithTimeout(`/api/creatives/${ideaId}/upvote`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 10000,
        signal: controller.signal,
      });

      // 仅当该请求仍是“最新请求”时，才根据返回值对齐计数
      if (controllerRef.current !== controller) return;

      if (!resp.ok) {
        // 非 2xx：若仍是最新请求，则回滚并提示
        if (desiredRef.current === nextSupported) {
          setSupported(!nextSupported);
          setCount((c) => (!nextSupported ? c + 1 : Math.max(0, c - 1)));
          toast(nextSupported ? "点赞失败，请重试" : "取消失败，请重试");
          const txt = await resp.text().catch(() => "");
          console.warn("Upvote toggle failed:", txt);
        }
        return;
      }

      const json = (await resp.json().catch(() => null)) as { upvote_count?: number; changed?: boolean } | null;
      if (controllerRef.current !== controller) return; // 已有新请求发出，忽略旧结果

      // 关键修复：若服务端返回 changed=false（无实际变更），忽略返回的 upvote_count，保留乐观值
      if (json && json.changed === false) {
        console.warn("Upvote API returned changed=false, keep optimistic count.", json);
      } else if (json?.upvote_count != null) {
        setCount(json.upvote_count);
      }

      // 本地缓存：仅当仍为最新请求时才写
      if (userId) {
        const cacheKey = `supported:${userId}:${ideaId}`;
        if (nextSupported) localStorage.setItem(cacheKey, "1");
        else localStorage.removeItem(cacheKey);
      }
    } catch (e) {
      // 中止错误直接忽略（因为用户触发了新的点击）
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      if (isAbort) return;

      // 其它错误：若仍是最新期望，则回滚
      if (desiredRef.current === nextSupported) {
        setSupported(!nextSupported);
        setCount((c) => (!nextSupported ? c + 1 : Math.max(0, c - 1)));
        console.error(e);
        toast("操作失败，请稍后重试");
      }
    }
  }

  // 若存在跨页标记 pendingSupport:{id}，则初始化为已支持并+1（保持原逻辑）
  useEffect(() => {
    if (!ideaId) return;
    const key = `pendingSupport:${ideaId}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      setSupported(true);
      setCount((c) => c + 1);
      desiredRef.current = true;
    }
  }, [ideaId]);

  // 假数据：关联项目与产品（数据表未就绪前的占位，便于展示 UI）
  const projectList = useMemo(
    () => [
      { name: "会议纪要自动化助手", status: "进行中", desc: "将AI引入会议纪要生成与推送", tag: "Web" },
      { name: "智能图像压缩器", status: "进行中", desc: "高保真压缩，极致体积", tag: "Desktop" },
    ],
    []
  );
  const productList = useMemo(
    () => [
      { name: "AI 日程助理", desc: "一键生成智能日程", tag: "Mobile" },
      { name: "快速标注平台", desc: "标签流水线，效率翻倍", tag: "Web" },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <button
          onClick={handleSupport}
          className={`w-full rounded-xl px-5 py-3 text-[16px] font-semibold text-white transition-transform active:scale-[0.98] ${supported ? "bg-gray-400 hover:bg-gray-400" : "bg-[#2ECC71] hover:bg-[#27AE60]"}`}
        >
          {supported ? "✓ 已想要" : "我也要"}
        </button>
        <p className="mt-2 text-center text-[13px] text-gray-600">
          已有 {Intl.NumberFormat("zh-CN").format(count)} 人想要
        </p>
      </div>

      {/* 复合信息卡：分为“项目区域”和“产品区域” */}
      <div className="rounded-2xl border border-gray-200 bg-white p-0 shadow-sm overflow-hidden">
        {/* 项目区域 */}
        <div className="p-5 border-b border-gray-100">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#2c3e50]">正在进行的项目</h3>
            <Link
              href={`/projects/new?idea_id=${ideaId ?? ""}`}
              className="inline-flex items-center rounded-lg border border-[#2ECC71] px-3 py-1.5 text-[13px] font-medium text-[#2ECC71] hover:bg-[#2ECC71]/10 transition-colors active:scale-95"
            >
              我有个方案
            </Link>
          </div>
          <ul className="space-y-3">
            {projectList.map((p, idx) => (
              <li key={idx} className="group rounded-lg border border-gray-200 bg-white/70 px-4 py-3 text-[13px] text-[#2c3e50] hover:border-[#2ECC71]/50 hover:bg-[#2ECC71]/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.name}</div>
                  <span className="ml-3 inline-flex items-center rounded-md bg-[#2ECC71]/10 px-2 py-0.5 text-[12px] text-[#27AE60] ring-1 ring-[#2ECC71]/20">{p.status}</span>
                </div>
                <div className="mt-1 line-clamp-1 text-gray-600">{p.desc}</div>
                <div className="mt-1 text-xs text-gray-400">#{p.tag}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* 产品区域 */}
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#2c3e50]">已发布产品</h3>
            <Link
              href={`/products/new?from_creative=${ideaId ?? ""}`}
              className="inline-flex items-center rounded-lg border border-[#3498db] px-3 py-1.5 text-[13px] font-medium text-[#3498db] hover:bg-[#3498db]/10 transition-colors active:scale-95"
            >
              我有个产品
            </Link>
          </div>
          <ul className="space-y-3">
            {productList.map((p, idx) => (
              <li key={idx} className="group rounded-lg border border-gray-200 bg-white/70 px-4 py-3 text-[13px] text-[#2c3e50] hover:border-[#3498db]/50 hover:bg-[#3498db]/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.name}</div>
                  <span className="ml-3 inline-flex items-center rounded-md bg-[#3498db]/10 px-2 py-0.5 text-[12px] text-[#2980b9] ring-1 ring-[#3498db]/20">#{p.tag}</span>
                </div>
                <div className="mt-1 line-clamp-1 text-gray-600">{p.desc}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>


    </div>
  );
}


