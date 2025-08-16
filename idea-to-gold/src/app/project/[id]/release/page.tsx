"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";

type PageParams = { id: string };
type PageProps = { params?: PageParams };

type ProductType = "web" | "mobile" | "desktop" | "other";

export default function ProductReleasePage(_: PageProps = {}): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  // 表单提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单受控状态
  const [productName, setProductName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [features, setFeatures] = useState("");
  const [productTypes, setProductTypes] = useState<ProductType[]>(["web"]);
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

  // 清理预览URL
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      promoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [logoPreview, promoPreviews]);

  // 获取项目信息（模拟数据，实际应从API获取）
  const projectNameDisplay = "会议纪要自动化助手";

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
    setPromoFiles(files);
    setPromoPreviews(files.map((f) => URL.createObjectURL(f)));
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

  // 处理表单提交
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
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // 成功：先显示全局Toast（2.5s），再跳转
      localStorage.setItem("pendingToast", "恭喜！您的产品已成功发布！");
      // 派发自定义事件以触发同页面Toast显示
      window.dispatchEvent(new Event("localToast"));
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // 跳转到已发布的项目主页
      router.push(`/project/${id}`);
    } catch (error) {
      console.error("发布失败：", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      {/* 面包屑导航 */}
      <Breadcrumb 
      paths={[
           { href: "/projects", label: "我的项目" },
           { href: `/project/${id}`, label: projectNameDisplay },
           { label: "发布产品" }
      ]} 
      />

      {/* 页面标题 */}
      <h1 className="text-4xl font-bold tracking-tight text-[#2c3e50] text-center mb-8">
        发布你的产品，让世界看到你的创造！
      </h1>

      {/* 单列居中的表单容器 */}
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 产品Logo 上传（必填）*/}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2c3e50]">
                产品 Logo <span className="text-red-500">*</span>
              </label>
              <label className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white text-gray-500 hover:bg-gray-50">
                {logoPreview ? (
                  <>
                    {/* 预览Logo（正方形裁切） */}
                    <img src={logoPreview} alt="logo preview" className="h-full w-full object-cover" />
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
                      <img src={src} alt={`screenshot-${idx + 1}`} className="h-full w-full object-cover" />
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

            {/* 产品类型（单选，必选） */}
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
                <span className="text-sm text-[#2c3e50]">移动App</span>
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50 ${productTypes.includes("desktop") ? "border-[#2ECC71]" : "border-gray-300"}`}>
                <input type="checkbox" name="productTypes" value="desktop" checked={productTypes.includes("desktop")} onChange={() => toggleProductType("desktop")} className="h-4 w-4 text-[#2ECC71] focus:ring-[#2ECC71]" />
                <span className="text-sm text-[#2c3e50]">桌面客户端</span>
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
                     className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:border-[#2ECC71] focus:outline-none"
                   />
                 </div>
                 <div className="space-y-2">
                   <label htmlFor="androidLink" className="block text-sm font-medium text-[#2c3e50]">安卓市场链接</label>
                   <input
                     id="androidLink"
                     type="url"
                     placeholder="https://play.google.com/store/apps/details?id=..."
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
                     className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#2c3e50] placeholder:text-gray-400 focus:border-[#2ECC71] focus:outline-none"
                   />
                 </div>
                 <div className="space-y-2">
                   <label htmlFor="macLink" className="block text-sm font-medium text-[#2c3e50]">macOS 下载链接</label>
                   <input
                     id="macLink"
                     type="url"
                     placeholder="https://example.com/download/app.dmg"
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
                disabled={isSubmitting}
                className="w-full sm:w-auto rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-[#2c3e50] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 rounded-md bg-[#2ECC71] px-6 py-3 text-[16px] font-semibold text-white hover:bg-[#27AE60] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "发布中..." : "确认发布"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}