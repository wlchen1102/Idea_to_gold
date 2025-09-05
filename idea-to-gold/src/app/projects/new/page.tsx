// 创建新项目页面（功能：可空关联创意；提交后调用 /api/projects/new 创建项目；若 URL 携带 idea_id 则自动关联）
"use client";

// 声明页面运行在 Edge Runtime，并强制动态渲染以避免构建期预渲染错误
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import Breadcrumb from "@/components/Breadcrumb";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { requireSupabaseClient } from "@/lib/supabase";

// 创意简要类型（用于右侧信息栏展示）
interface CreativeBrief {
  id: string;
  title: string;
  description: string;
  upvotes?: number;
  terminals?: string[];
}

// 创建项目接口响应类型
interface CreateProjectResponse {
  message: string;
  id?: string;
  error?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const creativeId = useMemo(() => searchParams?.get("idea_id") ?? "", [searchParams]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creative, setCreative] = useState<CreativeBrief | null>(null);
  const [loadingCreative, setLoadingCreative] = useState<boolean>(false);
  const [creativeError, setCreativeError] = useState<string>("");

  // 加载关联创意详情（若 URL 携带 idea_id）
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!creativeId) {
        setCreative(null);
        setCreativeError("");
        return;
      }
      setLoadingCreative(true);
      setCreativeError("");
      try {
        // 可选携带 Authorization，若用户已登录
        let headers: Record<string, string> = { "Content-Type": "application/json" };
        try {
          const supabase = requireSupabaseClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) headers = { ...headers, Authorization: `Bearer ${session.access_token}` };
        } catch (_e) {
          // 忽略：未配置 supabase 前端变量时，按公共接口访问
        }

        const resp = await fetch(`/api/creatives/${encodeURIComponent(creativeId)}`, { headers });
        const data = (await resp.json()) as { message: string; creative?: { id: string; title: string; description: string; terminals?: string[]; upvote_count?: number; upvotes?: number } };
        if (!ignore) {
          if (resp.ok && data.creative?.id) {
            setCreative({
              id: data.creative.id,
              title: data.creative.title,
              description: data.creative.description,
              terminals: data.creative.terminals ?? [],
              upvotes: (typeof data.creative.upvote_count === 'number' ? data.creative.upvote_count : data.creative.upvotes) ?? undefined,
            });
          } else {
            setCreative(null);
            setCreativeError(data?.message || "加载创意详情失败");
          }
        }
      } catch (e) {
        if (!ignore) {
          setCreative(null);
          setCreativeError(e instanceof Error ? e.message : "未知错误");
        }
      } finally {
        if (!ignore) setLoadingCreative(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [creativeId]);

  // 提交表单：创建项目并跳转（创意关联可选）
  const handleCreateProject = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const name = String(formData.get("projectName") || "").trim();
      const description = String(formData.get("projectIntro") || "").trim();
      const status = String(formData.get("status") || "planning");

      if (!name || !description) {
        alert("请填写完整的项目信息");
        setIsSubmitting(false);
        return;
      }

      // 获取用户会话（客户端）并携带 Authorization 头
      const supabase = requireSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("请先登录后再创建项目");
        setIsSubmitting(false);
        return;
      }

      // 构建 payload：仅当选择了创意时才携带 creative_id
      const payload: { name: string; description: string; status: string; creative_id?: string } = {
        name,
        description,
        status,
      };
      if (creativeId) {
        payload.creative_id = creativeId;
      }

      const resp = await fetch("/api/projects/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await resp.json()) as CreateProjectResponse;
      if (resp.ok && data.id) {
        // 先响应，后处理：立即跳转到作者私有页（我的项目详情）
        router.push(`/projects/me/${data.id}`);
        return;
      }

      alert(data?.error || data?.message || "创建项目失败");
      setIsSubmitting(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建项目失败");
      setIsSubmitting(false);
    }
  }, [creativeId, router]);

  return (
    <>
      {/* 面包屑放在网格外部，确保右侧卡片与左侧标题（网格内顶部）对齐 */}
      <Breadcrumb paths={[{ href: "/projects/me", label: "我的项目" }, { label: "创建新项目" }]} />

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
                  name="projectName"
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
                  name="projectIntro"
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

        {/* 右侧信息栏：约 1/3 宽（md 及以上）。用于展示关联创意详情（根据 URL idea_id 加载）*/}
        <aside className="md:col-span-1">
          <div className="sticky top-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-lg font-semibold text-[#2c3e50]">关联创意详情（可选）</h2>

            {/* 创意标题 */}
            <h3 className="mt-3 text-base font-bold text-gray-900">
              {loadingCreative ? "加载中..." : creative?.title || (creativeError ? "加载失败" : "未选择创意")}
            </h3>

            {/* 创意描述 */}
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {creative?.description || (creativeId && loadingCreative ? "正在获取创意描述..." : "从创意详情页点击“发起项目”将自动带入创意信息（该步骤可跳过）")}
            </p>

            {/* 关联创意链接（采用项目详情“源于创意”样式）*/}
            {creative?.id ? (
              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <div className="border-l-4 border-gray-300 pl-4 text-sm text-gray-700">
                  <Link href={`/creatives/${encodeURIComponent(creative.id)}`} className="text-[#3498db] hover:underline">
                    源于创意：{creative.title}
                  </Link>
                </div>
              </div>
            ) : null}

            {/* 关键数据（上下排列）*/}
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-gray-500">想要人数</div>
                <div className="mt-1 text-base font-semibold text-gray-900">{creative?.upvotes ?? "-"}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-gray-500">期望终端</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(creative?.terminals ?? []).length > 0 ? (
                    (creative?.terminals ?? []).map((t, _idx) => (
                      <span key={t} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{t}</span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* 其他信息（可扩展）*/}
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              注：可选。若未选择创意，也可直接创建项目。以上信息将根据所选创意自动关联。
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}


