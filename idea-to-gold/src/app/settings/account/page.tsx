// 账户设置页面
"use client";

import { useEffect, useState } from "react";
import { requireSupabaseClient } from "@/lib/supabase";
import Image from "next/image";

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
  const [message, setMessage] = useState("");
  // 增加加载态，避免错误时一直显示"加载中"而不结束
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      setLoading(true);
      try {
        const supabase = requireSupabaseClient();
        
        // 获取用户基本信息
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setMessage("请先登录");
          setLoading(false);
          return;
        }

        // 获取用户资料
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profile) {
          setUser(profile);
          setNickname(profile.nickname || "");
          setAvatar(profile.avatar_url || "");
          setBio(profile.bio || "");
        } else {
          setMessage("未找到用户资料");
        }
      } catch (error) {
        console.error("加载用户资料失败:", error);
        setMessage("加载用户资料失败");
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const supabase = requireSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setMessage("登录已过期，请重新登录");
        return;
      }

      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          // 不再保存 avatar_url，后续再实现
          nickname: nickname.trim() || null,
          bio: bio.trim() || null,
        }),
      });

      if (response.ok) {
        setMessage("保存成功！");
        // 触发头像菜单更新
        window.dispatchEvent(
          new CustomEvent("auth:changed", {
            detail: { userId: user?.id },
          })
        );
      } else {
        const error = await response.text();
        setMessage(`保存失败: ${error}`);
      }
    } catch (error) {
      console.error("保存失败:", error);
      setMessage("保存失败，请重试");
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

          {/* 顶部提示：优先展示友好提示，不阻断布局 */}
          {(message || (!user && !loading)) && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              message.includes("成功")
                ? "bg-green-50 text-green-800"
                : "bg-yellow-50 text-yellow-800"
            }`}>
              {message || "未登录状态下信息不可编辑，请先登录。"}
              {!user && (
                <a href="/login" className="ml-3 underline text-emerald-700 hover:text-emerald-800">去登录</a>
              )}
            </div>
          )}

          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <div className="grid gap-4">
                {/* 头像展示（优先） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    头像
                  </label>
                  <div className="flex items-center gap-4">
                    {/* 加载骨架 */}
                    {loading ? (
                      <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
                    ) : avatar ? (
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
                      <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold">
                        {nickname?.charAt(0) || "用"}
                      </div>
                    )}
                  </div>
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

            {/* 消息提示（成功/失败）*/}
            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.includes("成功")
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {message}
              </div>
            )}

            {/* 保存按钮 */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || loading || !user}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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