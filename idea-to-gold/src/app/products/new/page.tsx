// 发布产品页面，通过URL查询参数 (Query Params)，来识别用户的“来路”，并获取必要的上下文信息:
// 【项目详情】上的“发布最终产品”按钮，现在应该链接到：'/products/new?from_project={projectId}'
// 【创意详情页】上的“我已有产品”按钮，现在应该链接到：'/products/new?from_creative={creativeId}'
// 产品广场的“发布产品”按钮，现在应该链接到：'/products/new'
// 页面内部的逻辑
// products/new/page.tsx 这个页面组件，会在加载时，用 useSearchParams() Hook来读取这些URL参数。
// 预填充数据:如果URL里有from_project，它可以先去API请求一下这个项目的信息，然后把项目的名称，作为产品名称的默认值，预先填充到表单里。
// 提交数据:当用户最终提交表单时，它会把从URL参数里获取到的 project_id 或 creative_id，连同所有表单数据，一起发送给后端的同一个“创建产品”API (POST /api/products)。

"use client";

// 声明允许cloudflare将动态页面部署到“边缘环境”上（保持与项目一致的 Edge Runtime）
export const runtime = 'edge';

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import Image from "next/image";
import { getFreshAuth } from "@/lib/auth";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

// 产品类型定义
type ProductType = "web" | "mobile" | "desktop" | "other";

export default function ProductReleasePage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromProject = searchParams.get("from_project");
  const fromCreative = searchParams.get("from_creative");

  // 表单提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单受控状态
  const [productName, setProductName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [features, setFeatures] = useState("");
  const [productTypes, setProductTypes] = useState<ProductType[]>(["web"]);
  // 链接状态（按类型可选）
  const [webLink, setWebLink] = useState("");
  const [iosLink, setIosLink] = useState("");
  const [androidLink, setAndroidLink] = useState("");
  const [winLink, setWinLink] = useState("");
  const [macLink, setMacLink] = useState("");
  const [otherLink, setOtherLink] = useState("");

  // 切换产品类型（复选）
  const toggleProductType = (t: ProductType) => {
    setProductTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    // 用户一旦操作类型，清理错误提示
    setErrors((p) => ({ ...p, productTypes: "" }));
  };
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [promoFiles, setPromoFiles] = useState<File[]>([]);
  const [promoPreviews, setPromoPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 页面展示用的项目名（用于面包屑/返回路径提示）
  const [projectNameDisplay, setProjectNameDisplay] = useState("");

  // 清理预览URL
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      promoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [logoPreview, promoPreviews]);

  // 若来自项目详情页（from_project），预取项目信息并预填产品名
  useEffect(() => {
    const run = async () => {
      if (!fromProject) return;
      try {
        const { token } = await getFreshAuth();
        if (!token) return; // 未登录则忽略预填
        const resp = await fetchWithTimeout(`/api/projects/me/${fromProject}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          timeoutMs: 10000,
        });
        if (resp.ok) {
          const data = await resp.json();
          const pname = data?.project?.title || data?.project?.name || "";
          if (pname && !productName) setProductName(pname);
          if (pname) setProjectNameDisplay(pname);
        }
      } catch (e) {
        // 预填失败不影响后续
      }
    };
    run();
    // 仅当进入页面或fromProject变化时尝试一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromProject]);

  // 处理Logo选择
  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    // 去除该字段错误
    setErrors((prev) => ({ ...prev, logo: "" }));
  };

  // 处理宣传图选择
  const onPromoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // 清理旧预览
    promoPreviews.forEach((url) => URL.revokeObjectURL(url));
    // 最多5张
    const limited = files.slice(0, 5);
    setPromoFiles(limited);
    setPromoPreviews(limited.map((f) => URL.createObjectURL(f)));
    setErrors((prev) => ({ ...prev, promos: "" }));
  };

  // 校验函数
  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!logoFile) newErrors.logo = "请上传产品Logo";
    if (!productName.trim()) newErrors.productName = "请输入产品名称";
    if (!slogan.trim()) newErrors.slogan = "请输入一句话Slogan";
    if (!promoFiles.length) newErrors.promos = "请至少上传1张产品宣传图/截图";
    if (!features.trim()) newErrors.features = "请输入详细功能介绍";
    if (!productTypes.length) newErrors.productTypes = "请选择至少一个产品类型";
    return newErrors;
  };

  // 工具：File 转 DataURL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 提交发布
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // 先并发转换图片为 dataURL（先响应UI：按钮进入loading；后处理文件转换）
      const [logoDataUrl, promoDataUrls] = await Promise.all([
        logoFile ? fileToDataUrl(logoFile) : Promise.resolve(""),
        Promise.all(promoFiles.map((f) => fileToDataUrl(f))),
      ]);

      const { token } = await getFreshAuth();
      if (!token) {
        window.alert("请先登录后再发布产品");
        return;
      }

      // 组装访问链接（仅保留非空值）
      const access_info: Record<string, string> = {};
      if (productTypes.includes("web") && webLink.trim()) access_info.web = webLink.trim();
      if (productTypes.includes("mobile")) {
        if (iosLink.trim()) access_info.ios = iosLink.trim();
        if (androidLink.trim()) access_info.android = androidLink.trim();
      }
      if (productTypes.includes("desktop")) {
        if (winLink.trim()) access_info.win = winLink.trim();
        if (macLink.trim()) access_info.mac = macLink.trim();
      }
      if (productTypes.includes("other") && otherLink.trim()) access_info.other = otherLink.trim();

      // 调用后端真实接口
      const resp = await fetchWithTimeout("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: fromProject ?? null,
          creative_id: fromCreative ?? null,
          name: productName.trim(),
          slogan: slogan.trim(),
          logo_url: logoDataUrl,
          screenshots: promoDataUrls,
          description: features.trim(),
          product_types: productTypes,
          access_info,
        }),
        timeoutMs: 15000,
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        const msg = errJson?.message || `发布失败（${resp.status}）`;
        window.alert(msg);
        return;
      }

      // 成功：先显示全局Toast（2.5s），再跳转
      localStorage.setItem("pendingToast", "恭喜！您的产品已成功发布！");
      // 派发自定义事件以触发同页面Toast显示
      window.dispatchEvent(new Event("localToast"));
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // 跳转到已发布的项目主页（作者私有页 /projects/me/[id]）
      if (fromProject) router.push(`/projects/me/${fromProject}`);
      else router.push("/projects/me");
    } catch (error) {
      console.error("发布失败：", error);
      window.alert("发布过程中发生错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      {/* 面包屑导航（全部使用 /projects 规范路径）*/}
      <Breadcrumb 
        paths={fromProject ? [
          { href: "/projects/me", label: "我的项目" },
          { href: `/projects/me/${fromProject}` , label: projectNameDisplay || "项目详情" },
          { label: "发布产品" }
        ] : [
          { href: "/products", label: "产品广场" },
          { label: "发布产品" }
        ]} 
      />

      {/* 页面标题 */}
      <h1 className="text-4xl font-bold tracking-tight text-[#2c3e50] text-center mb-8">
        发布你的产品，让世界看到你的创造！
      </h1>

      <div className="max-w-2xl mx-auto">
        <div className="mb-4 flex items-center justify-end">
          {fromProject && (
            <a href={`/projects/${fromProject}`} className="text-sm text-[#3498db] hover:underline">查看公开页</a>
          )}
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 产品Logo 上传（必填）*/}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2c3e50]">
                产品 Logo <span className="text-red-500">*</span>
              </label>
              <label className="relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white text-gray-500 hover:bg-gray-50">
                {logoPreview ? (
                  <>
                    {/* 预览Logo（正方形裁切） */}
                    <Image src={logoPreview} alt="logo preview" fill className="object-cover" unoptimized />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-2xl leading-none">+</div>
                    <div className="mt-1 text-xs">上传Logo</div>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-400">建议尺寸≥256×256，支持 PNG、JPG、SVG</p>
              {errors.logo && <p className="text-xs text-red-500">{errors.logo}</p>}
            </div>

            {/* 产品名称（必填） */}
            <div className="space-y-2">
              <label htmlFor="productName" className="block text-sm font-medium text-[#2c3e50]">
                产品名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  if (errors.productName) setErrors((p) => ({ ...p, productName: "" }));
                }}
                placeholder="例如：会议纪要自动化助手"
                className={`w-full rounded-md border px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:outline-none ${errors.productName ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-[#2ECC71]"}`}
              />
              {errors.productName && <p className="text-xs text-red-500">{errors.productName}</p>}
            </div>

            {/* 一句话 Slogan（必填） */}
            <div className="space-y-2">
              <label htmlFor="slogan" className="block text-sm font-medium text-[#2c3e50]">
                一句话 Slogan <span className="text-red-500">*</span>
              </label>
              <input
                id="slogan"
                type="text"
                value={slogan}
                onChange={(e) => {
                  setSlogan(e.target.value);
                  if (errors.slogan) setErrors((p) => ({ ...p, slogan: "" }));
                }}
                placeholder="用一句话描述你的产品亮点"
                className={`w-full rounded-md border px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:outline-none ${errors.slogan ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-[#2ECC71]"}`}
              />
              {errors.slogan && <p className="text-xs text-red-500">{errors.slogan}</p>}
            </div>

            {/* 产品宣传图/截图 上传（必填） */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2c3e50]">
                产品宣传图 / 截图 <span className="text-red-500">*</span>
              </label>
              <label className="flex h-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-gray-500 hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-2xl leading-none">+</div>
                  <div className="mt-1 text-xs">上传1-5张截图</div>
                </div>
                <input type="file" accept="image/*" multiple onChange={onPromoChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-400">建议尺寸≥1280×720，支持 PNG、JPG</p>
              {errors.promos && <p className="text-xs text-red-500">{errors.promos}</p>}
              {promoPreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {promoPreviews.map((src, idx) => (
                    <div key={idx} className="relative aspect-video overflow-hidden rounded-md border border-gray-200">
                      <Image src={src} alt={`screenshot-${idx + 1}`} fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 详细功能介绍（必填） */}
            <div className="space-y-2">
              <label htmlFor="features" className="block text-sm font-medium text-[#2c3e50]">
                详细功能介绍 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="features"
                value={features}
                onChange={(e) => {
                  setFeatures(e.target.value);
                  if (errors.features) setErrors((p) => ({ ...p, features: "" }));
                }}
                placeholder="介绍你的产品功能、目标用户、核心价值与使用方式……"
                className={`h-[150px] w-full resize-y rounded-md border px-3 py-2 text-sm leading-6 text-[#2c3e50] placeholder:text-gray-400 focus:outline-none ${errors.features ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-[#2ECC71]"}`}
              />
              {errors.features && <p className="text-xs text-red-500">{errors.features}</p>}
            </div>

            {/* 产品类型（多选，必选） */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-[#2c3e50]">
                产品类型 <span className="text-red-500">*</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50 ${productTypes.includes("web") ? "border-[#2ECC71]" : "border-gray-300"}`}>
                  <input type="checkbox" name="productTypes" value="web" checked={productTypes.includes("web")} onChange={() => toggleProductType("web")} className="h-4 w-4 text-[#2ECC71] focus:ring-[#2ECC71]" />
                  <span className="text-sm text-[#2c3e50]">网页应用</span>
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50 ${productTypes.includes("mobile") ? "border-[#2ECC71]" : "border-gray-300"}`}>
                  <input type="checkbox" name="productTypes" value="mobile" checked={productTypes.includes("mobile")} onChange={() => toggleProductType("mobile")} className="h-4 w-4 text-[#2ECC71] focus:ring-[#2ECC71]" />
                  <span className="text-sm text-[#2c3e50]">移动应用</span>
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50 ${productTypes.includes("desktop") ? "border-[#2ECC71]" : "border-gray-300"}`}>
                  <input type="checkbox" name="productTypes" value="desktop" checked={productTypes.includes("desktop")} onChange={() => toggleProductType("desktop")} className="h-4 w-4 text-[#2ECC71] focus:ring-[#2ECC71]" />
                  <span className="text-sm text-[#2c3e50]">桌面应用</span>
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50 ${productTypes.includes("other") ? "border-[#2ECC71]" : "border-gray-300"}`}>
                  <input type="checkbox" name="productTypes" value="other" checked={productTypes.includes("other")} onChange={() => toggleProductType("other")} className="h-4 w-4 text-[#2ECC71] focus:ring-[#2ECC71]" />
                  <span className="text-sm text-[#2c3e50]">其他</span>
                </label>
              </div>
              {errors.productTypes && <p className="text-xs text-red-500">{errors.productTypes}</p>}
            </div>

            {/* 链接区域（非必填） */}
            <div className="space-y-4">
            {/* 网页应用链接：勾选 web 时显示 */}
            {productTypes.includes("web") && (
               <div className="space-y-2">
                 <label htmlFor="webLink" className="block text-sm font-medium text-[#2c3e50]">网站访问链接</label>
                 <input
                   id="webLink"
                   type="url"
                   placeholder="https://your-product.com"
                   value={webLink}
                   onChange={(e) => setWebLink(e.target.value)}
                   className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:border-[#2ECC71] focus:outline-none"
                 />
               </div>
             )}

            {/* 移动App链接：勾选 mobile 时显示 */}
            {productTypes.includes("mobile") && (
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <div className="space-y-2">
                   <label htmlFor="iosLink" className="block text-sm font-medium text-[#2c3e50]">App Store 链接(iOS)</label>
                   <input
                     id="iosLink"
                     type="url"
                     placeholder="https://apps.apple.com/app/..."
                     value={iosLink}
                     onChange={(e) => setIosLink(e.target.value)}
                     className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:border-[#2ECC71] focus:outline-none"
                   />
                 </div>
                 <div className="space-y-2">
                   <label htmlFor="androidLink" className="block text-sm font-medium text-[#2c3e50]">安卓市场链接</label>
                   <input
                     id="androidLink"
                     type="url"
                     placeholder="https://play.google.com/store/apps/details?id=..."
                     value={androidLink}
                     onChange={(e) => setAndroidLink(e.target.value)}
                     className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:border-[#2ECC71] focus:outline-none"
                   />
                 </div>
               </div>
             )}

            {/* 桌面客户端链接：勾选 desktop 时显示 */}
            {productTypes.includes("desktop") && (
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <div className="space-y-2">
                   <label htmlFor="winLink" className="block text-sm font-medium text-[#2c3e50]">Windows 下载链接</label>
                   <input
                     id="winLink"
                     type="url"
                     placeholder="https://example.com/download/app-setup.exe"
                     value={winLink}
                     onChange={(e) => setWinLink(e.target.value)}
                     className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:border-[#2ECC71] focus:outline-none"
                   />
                 </div>
                 <div className="space-y-2">
                   <label htmlFor="macLink" className="block text-sm font-medium text-[#2c3e50]">macOS 下载链接</label>
                   <input
                     id="macLink"
                     type="url"
                     placeholder="https://example.com/download/app.dmg"
                     value={macLink}
                     onChange={(e) => setMacLink(e.target.value)}
                     className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:border-[#2ECC71] focus:outline-none"
                   />
                 </div>
               </div>
             )}
            {productTypes.includes("other") && (
              <div className="space-y-2">
                <label htmlFor="otherLink" className="block text-sm font-medium text-[#2c3e50]">其他类型访问链接</label>
                <input
                  id="otherLink"
                  type="url"
                  placeholder="https://example.com/..."
                  value={otherLink}
                  onChange={(e) => setOtherLink(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:border-[#2ECC71] focus:outline-none"
                />
              </div>
            )}
            </div>

            {/* 底部操作区 */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="border border-gray-300 hover:bg-gray-50 text-[#2c3e50] font-medium px-4 py-2 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                type="submit"
                className={`bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold px-5 py-2 rounded-md transition-colors ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "发布中…" : "发布"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}