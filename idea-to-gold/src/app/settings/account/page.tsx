// 账号设置 - 带Tab切换功能的完整版本
// 技术栈：React + TypeScript + Tailwind CSS + React Hooks
// 说明：本页面实现左侧导航 + 右侧内容区的两栏布局，支持"公开资料"和"账户安全"两个Tab的动态切换

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TextInput from '@/components/ui/TextInput'
import Textarea from '@/components/ui/Textarea'

// 定义Tab的类型
type TabType = 'profile' | 'security'

export default function AccountSettingsPage() {
  // 使用useState管理当前激活的Tab（默认为公开资料）
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  // 公开资料：新增本地状态来存储从数据库获取的数据
  const [nickname, setNickname] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 页面首次加载时拉取当前登录用户的资料
  useEffect(() => {
    let isMounted = true // 防止组件卸载后更新state

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError('')

        // 1) 获取当前登录用户
        const { data: userResp, error: userErr } = await supabase.auth.getUser()
        if (userErr) throw userErr

        const user = userResp?.user
        if (!user) {
          // 未登录：清空展示
          if (isMounted) {
            setNickname('')
            setBio('')
          }
          return
        }

        // 2) 查询 profiles 表获取 nickname 和 bio
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname, bio, avatar_url')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (isMounted && data) {
          setNickname(data.nickname || '')
          setBio(data.bio || '')
          setAvatarUrl((data as any).avatar_url || '')
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || '加载用户资料失败')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [])

  // 点击保存：调用后端 PATCH /api/users/me/profile 接口
  const handleSave = async () => {
    console.log('保存按钮被点击了')
    try {
      setIsSaving(true)
      setError('')

      // 获取当前会话的访问令牌
      const { data: sessionResp, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) throw sessionErr
      const accessToken = sessionResp?.session?.access_token
      if (!accessToken) throw new Error('未登录或会话已过期，请重新登录')

      console.log('准备发送请求到 /api/users/me/profile', { nickname, bio })

      const resp = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ nickname, bio }),
      })

      const result = await resp.json().catch(() => ({}))
      console.log('API响应:', result)
      
      if (!resp.ok) {
        const msg = result?.message || '更新失败'
        throw new Error(msg)
      }

      setToast({ type: 'success', message: '资料更新成功！' })
      setTimeout(() => setToast(null), 2500)
    } catch (e: any) {
      console.error('保存失败:', e)
      setToast({ type: 'error', message: e?.message || '更新失败' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="w-full min-h-screen bg-gray-50">
      {/* 全局 Toast 提示 */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
      {/* 页面容器 */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* 页面标题 */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">账号设置</h2>

        {/* 两栏布局：左侧导航 + 右侧内容 */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6">
          {/* 左侧：垂直导航菜单 */}
          <nav aria-label="设置导航" className="md:sticky md:top-6 self-start">
            <ul className="space-y-2">
              {/* 公开资料 */}
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  aria-current={activeTab === 'profile' ? 'page' : undefined}
                  className={
                    `w-full text-left block rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 ` +
                    (activeTab === 'profile'
                      ? 'border border-green-200 bg-green-50 text-green-700 shadow-sm focus:ring-green-400'
                      : 'border border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300')
                  }
                >
                  公开资料
                </button>
              </li>
              {/* 账户安全 */}
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  aria-current={activeTab === 'security' ? 'page' : undefined}
                  className={
                    `w-full text-left block rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 ` +
                    (activeTab === 'security'
                      ? 'border border-green-200 bg-green-50 text-green-700 shadow-sm focus:ring-green-400'
                      : 'border border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300')
                  }
                >
                  账户安全
                </button>
              </li>
            </ul>
          </nav>

          {/* 右侧：内容区，根据 activeTab 动态渲染，包裹在白色卡片内 */}
          <section aria-live="polite">
            {activeTab === 'profile' && (
              <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">公开资料</h3>

                {/* 头像上传区域（此处仍为占位，暂时不支持上传功能） */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">头像</label>
                  <div className="flex items-center gap-4">
                    {/* 头像：有链接则显示图片，否则显示占位 */}
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="当前头像"
                        className="h-24 w-24 rounded-full object-cover ring-1 ring-inset ring-gray-300"
                        onError={() => setAvatarUrl('')}
                      />
                    ) : (
                      <div
                        aria-label="当前头像占位图"
                        className="h-24 w-24 rounded-full bg-gray-200 ring-1 ring-inset ring-gray-300 flex items-center justify-center text-gray-400 text-xs"
                      >
                        100×100
                      </div>
                    )}

                    {/* 上传按钮（暂不支持上传，故完全注释掉） */}
                    {/*
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      上传新头像
                    </button>
                    */}
                  </div>
                </div>

                {/* 昵称编辑 */}
                <div className="mb-6">
                  <TextInput
                    id="nickname"
                    label="昵称"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={loading ? '加载中…' : '请输入你的昵称'}
                    error={error}
                  />
                </div>

                {/* 个人简介 */}
                <div className="mb-6">
                  <Textarea
                    id="bio"
                    label="个人简介"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={loading ? '加载中…' : '介绍一下你自己吧'}
                    autoResize={true}
                    maxLines={8}
                  />
                </div>

                {/* 底部操作区：保存按钮（暂未接入保存逻辑，仅展示 UI） */}
                <div className="mt-8 border-t border-gray-200 pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || loading}
                    className={`inline-flex items-center rounded-md px-5 py-2.5 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      isSaving || loading ? 'bg-green-400 cursor-not-allowed opacity-60' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isSaving ? '保存中…' : '保存更改'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">账户安全</h3>

                {/* 手机号区域 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">手机号</label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-900">138****1234</span>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        更换
                      </button>
                    </div>
                  </div>
                </div>

                {/* 修改密码表单 */}
                <div className="mb-6 grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      当前密码
                    </label>
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      新密码
                    </label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      确认新密码
                    </label>
                    <input
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      type="password"
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* 底部操作区：更新密码按钮 */}
                <div className="mt-8 border-t border-gray-200 pt-4 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    更新密码
                  </button>
                </div>
              </div>
            )}

            {/* 危险操作区，仅在security下方显示（与卡片分离，红色边框） */}
            {activeTab === 'security' && (
              <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4">
                <h4 className="text-sm font-semibold text-red-700 mb-3">危险操作</h4>
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-red-300 bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  注销账号
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}