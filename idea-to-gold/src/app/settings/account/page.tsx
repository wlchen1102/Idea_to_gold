// 页面：账户设置（/settings/account）
// 作用：提供用户在客户端编辑基础资料（昵称、头像预览、个人简介）；通过 Edge API 读取/写入；符合 Cloudflare Pages + Next.js Edge Runtime 架构。
"use client";

export const runtime = 'edge';

import { useEffect, useRef, useState, useCallback } from "react";
import { requireSupabaseClient } from "@/lib/supabase";
import Image from "next/image";
import Uploader, { type UploaderHandle } from "@/components/Uploader";

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url?: string;
  bio?: string;
}

function AccountSettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  // 增加加载态，避免错误时一直显示"加载中"而不结束
  const [loading, setLoading] = useState(true);
  // 防止 React 严格模式下 useEffect 执行两次导致的重复请求
  const loadedRef = useRef(false);
  // 通过 ref 控制隐藏的 Uploader，点击“修改”时直接 open()
  const uploaderRef = useRef<UploaderHandle | null>(null);
  // 新增：本地预览与变更标记（仅选择，不立即上传）
  const [hasPendingAvatarChange, setHasPendingAvatarChange] = useState<boolean>(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (loadedRef.current) return; // 严格模式下第二次调用直接跳过
      loadedRef.current = true;
      setLoading(true);
      try {
        const supabase = requireSupabaseClient();
        // 仅从本地取 token，不再直接从浏览器查询 Supabase 数据库
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setLoading(false);
          return;
        }

        // 改为请求我们在 Edge 上的轻量接口（只返回需要的字段，且离用户更近）
        const resp = await fetch("/api/users/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!resp.ok) {
          const txt = await resp.text();
          console.warn(`加载用户资料失败: ${txt}`);
          setLoading(false);
          return;
        }
        const json = (await resp.json()) as {
          profile: UserProfile | null;
        };
        if (json.profile) {
          setUser(json.profile);
          setNickname(json.profile.nickname || "");
          setAvatar(json.profile.avatar_url || "");
          setBio(json.profile.bio || "");
        } else {
          console.warn("未找到用户资料");
        }
      } catch (error) {
        console.error("加载用户资料失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  // 文件选择后：仅做本地预览与变更标记
  const handleAvatarFileSelected = useCallback((_file: File, previewUrl: string) => {
    setHasPendingAvatarChange(true);
    // 仅在 UI 上立即显示预览（不请求接口）
    setAvatar(previewUrl);
  }, []);

  const handleSave = async () => {
    setSaving(true);

    try {
      const supabase = requireSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        localStorage.setItem("pendingToast", "登录已过期，请重新登录");
        window.dispatchEvent(new Event("localToast"));
        return;
      }

      // 若头像发生变化：先上传获取 URL
      let avatarUrlToSave: string | undefined = undefined;
      if (hasPendingAvatarChange) {
        const uploadedUrl = await uploaderRef.current?.uploadSelected();
        if (!uploadedUrl) {
          localStorage.setItem("pendingToast", "头像上传失败，请重试");
          window.dispatchEvent(new Event("localToast"));
          return; // 终止保存，等待用户重试
        }
        avatarUrlToSave = uploadedUrl;
      }

      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nickname: nickname.trim() || null,
          bio: bio.trim() || null,
          ...(avatarUrlToSave ? { avatar_url: avatarUrlToSave } : {}),
        }),
      });

      if (response.ok) {
        // 使用全局Toast提示
        localStorage.setItem("pendingToast", "保存成功！");
        window.dispatchEvent(new Event("localToast"));
        
        // 如果包含头像更新，则落盘并清理“待保存”状态
        if (avatarUrlToSave) {
          setAvatar(avatarUrlToSave);
          setHasPendingAvatarChange(false);
        }
        
        // 触发头像菜单更新
        window.dispatchEvent(
          new CustomEvent("auth:changed", {
            detail: { userId: user?.id },
          })
        );
      } else {
        const error = await response.text();
        localStorage.setItem("pendingToast", `保存失败: ${error}`);
        window.dispatchEvent(new Event("localToast"));
      }
    } catch (error) {
      console.error("保存失败:", error);
      localStorage.setItem("pendingToast", "保存失败，请重试");
      window.dispatchEvent(new Event("localToast"));
    } finally {
      setSaving(false);
    }
  };

  // 统一渲染页面结构：加载中/未登录时用占位与禁用，避免整页卡住
  const inputsDisabled = loading || !user || saving;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">账户设置</h1>

          {/* 未登录提示 */}
          {!user && !loading && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-yellow-50 text-yellow-800">
              未登录状态下信息不可编辑，请先登录。
              <a href="/login" className="ml-3 underline text-emerald-700 hover:text-emerald-800">去登录</a>
            </div>
          )}

          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <div className="grid gap-4">
                {/* 头像展示（新增悬浮遮罩与修改按钮） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    头像
                  </label>
                  <div className="flex items-center gap-4">
                    {/* 加载骨架 */}
                    {loading ? (
                      <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
                    ) : (
                      <div className="relative group h-16 w-16">
                        {avatar ? (
                          <Image
                            src={avatar}
                            alt="用户头像"
                            width={64}
                            height={64}
                            unoptimized
                            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold select-none">
                            {nickname?.charAt(0) || "用"}
                          </div>
                        )}
                        {/* 悬浮遮罩与修改按钮 */}
                        {user && (
                          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                            <button
                              type="button"
                              onPointerDown={() => uploaderRef.current?.open()}
                              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white/90 text-gray-900 shadow hover:shadow-md active:scale-95 transition"
                              onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)")}
                              onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  uploaderRef.current?.open();
                                }
                              }}
                            >
                              修改
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 选择后的小提示：不立即上传，等待保存 */}
                  {hasPendingAvatarChange && (
                    <div className="mt-2 text-xs text-gray-500">已选择新头像，点击“保存更改”后将上传并生效。</div>
                  )}

                  {/* 隐藏但常驻的 Uploader：通过 ref.open() 直接拉起文件选择框；设置为仅选择不上传 */}
                  <Uploader
                    ref={uploaderRef}
                    onUploadSuccess={() => { /* 上传在保存时触发并处理，这里故意 no-op */ }}
                    allowedTypes={["image/jpeg", "image/png"]}
                    maxSizeMB={5}
                    buttonText="上传头像"
                    className="absolute left-[-9999px] top-[-9999px] w-0 h-0 overflow-hidden"
                    autoUpload={false}
                    onFileSelected={handleAvatarFileSelected}
                  />
                </div>

                {/* 用户ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用户ID
                  </label>
                  <input
                    type="text"
                    value={user?.id || ""}
                    placeholder={loading ? "加载中..." : user ? user.id : "未登录"}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500"
                  />
                </div>

                {/* 昵称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    昵称
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={loading ? "加载中..." : "请输入昵称"}
                    disabled={inputsDisabled}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* 个人简介 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    个人简介
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={loading ? "加载中..." : "请输入个人简介"}
                    rows={4}
                    disabled={inputsDisabled}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>



            {/* 保存按钮 */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || loading || !user}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
              >
                {saving ? "保存中..." : (loading || !user) ? "等待数据..." : "保存更改"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsPage;