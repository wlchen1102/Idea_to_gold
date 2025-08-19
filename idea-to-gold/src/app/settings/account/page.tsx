// 账户设置页面
"use client";

import { useEffect, useState } from "react";
import { requireSupabaseClient } from "@/lib/supabase";

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

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const supabase = requireSupabaseClient();
        
        // 获取用户基本信息
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setMessage("请先登录");
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
        }
      } catch (error) {
        console.error("加载用户资料失败:", error);
        setMessage("加载用户资料失败");
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">账户设置</h1>

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
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="头像预览"
                        className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold">
                        {nickname?.charAt(0) || "用"}
                      </div>
                    )}
                    {/* 移除头像URL输入框，仅保留头像展示 */}
                  </div>
                </div>

                {/* 用户ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用户ID
                  </label>
                  <input
                    type="text"
                    value={user.id}
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
                    placeholder="请输入昵称"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    placeholder="请输入个人简介"
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 消息提示 */}
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
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : "保存更改"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsPage;