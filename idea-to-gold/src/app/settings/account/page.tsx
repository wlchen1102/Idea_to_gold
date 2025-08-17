// 账号设置 - 带Tab切换功能的完整版本
// 技术栈：React + TypeScript + Tailwind CSS + React Hooks
// 说明：本页面实现左侧导航 + 右侧内容区的两栏布局，支持"公开资料"和"账户安全"两个Tab的动态切换

'use client'

import { useState } from 'react'

// 定义Tab的类型
type TabType = 'profile' | 'security'

export default function AccountSettingsPage() {
  // 使用useState管理当前激活的Tab（默认为公开资料）
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  return (
    <main className="w-full min-h-screen bg-gray-50">
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

                {/* 头像上传区域 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">头像</label>
                  <div className="flex items-center gap-4">
                    {/* 头像占位符：100x100 圆形 */}
                    <div
                      aria-label="当前头像占位图"
                      className="h-24 w-24 rounded-full bg-gray-200 ring-1 ring-inset ring-gray-300 flex items-center justify-center text-gray-400 text-xs"
                    >
                      100×100
                    </div>

                    {/* 上传按钮（静态按钮，无交互逻辑） */}
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      上传新头像
                    </button>
                  </div>
                </div>

                {/* 昵称编辑 */}
                <div className="mb-6">
                  <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                    昵称
                  </label>
                  <input
                    id="nickname"
                    name="nickname"
                    type="text"
                    defaultValue="创意玩家"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* 个人简介 */}
                <div className="mb-6">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                    个人简介
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    defaultValue="热爱产品与技术的创作者，专注将想法打造成真正有价值的作品。"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* 底部操作区：保存按钮 */}
                <div className="mt-8 border-t border-gray-200 pt-4 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    保存更改
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