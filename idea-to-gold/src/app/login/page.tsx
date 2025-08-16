// 登录/注册入口页面 - 第一阶段与预置的第二阶段UI（默认隐藏）
// 说明：
// - 本页面采用 Next.js App Router（src/app）结构与 TypeScript + Tailwind CSS 编写
// - 满足“第一阶段”需求：仅展示手机号输入与“继续”按钮
// - “第二阶段”潜在UI元素（密码相关与协议勾选）已预置在同一文件中，默认用 hidden 类隐藏
// - 为了保持简单（KISS & YAGNI），暂不引入交互逻辑（例如密码可见性切换、强度实时计算等）

'use client'

import React, { useState } from "react";

export default function LoginPage() {
  const [showSecondStage, setShowSecondStage] = useState(false); // 控制第二阶段UI显示
  const [phone, setPhone] = useState(''); // 手机号
  const [phoneError, setPhoneError] = useState(''); // 手机号错误信息
  const [loginPwVisible, setLoginPwVisible] = useState(false); // 登录密码是否可见
  const [setPwVisible, setSetPwVisible] = useState(false); // 注册-设置密码是否可见
  const [confirmPwVisible, setConfirmPwVisible] = useState(false); // 注册-确认密码是否可见

  // 中国大陆手机号：以1开头，第2位3-9，总共11位
  const CN_PHONE_REGEX = /^1[3-9]\d{9}$/;

  const validatePhone = (value: string) => {
    const v = value.trim();
    const ok = CN_PHONE_REGEX.test(v);
    setPhoneError(ok || v === '' ? '' : '请输入一个有效的11位手机号码');
    return ok;
  };

  const isPhoneValid = CN_PHONE_REGEX.test(phone.trim());
  const canContinue = phone.trim() !== '' && isPhoneValid;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:py-12">
        {/* 两列布局：左侧产品介绍，右侧登录表单 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* 左侧：产品介绍/品牌展示区 */}
          <aside className="order-2 lg:order-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-100/40 p-8 lg:p-10">
            {/* 背景装饰 */}
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-6 -left-6 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl" />
              <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
              <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-purple-200/20 blur-3xl" />
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                点亮你的
                <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent"> AI创意</span>
                ，让世界看到你的创造
              </h2>
              <p className="text-gray-600 leading-7">
                一个连接真实需求与顶尖AI开发者的孵化平台。在这里，每个好创意都能“点石成金”。
              </p>

              <div className="mt-4 space-y-4">
                <FeatureItem title="AI需求分析师" desc="多轮对话澄清需求，自动生成可执行方案" />
                <FeatureItem title="透明化的项目空间" desc="阶段式进度与开发日志，实时可见" />
                <FeatureItem title="社区驱动的价值发现" desc="‘我也要’投票，真实市场信号" />
              </div>

              <div className="pt-2 text-sm text-gray-500">
                已被来自 Google、Meta 等机构的创造者们使用
              </div>
            </div>
          </aside>

          {/* 右侧：登录/注册入口表单 */}
          <section className="order-1 lg:order-2 w-full max-w-md lg:ml-auto">
            <div className="bg-white shadow-xl rounded-2xl p-8">
              {/* 标题与副标题 */}
              <header className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">欢迎来到点子成金</h1>
                <p className="mt-2 text-gray-600">输入手机号，开始或继续你的创造之旅。</p>
              </header>

              {/* 表单区域（第一阶段：仅手机号 + 继续按钮）*/}
              <form className="space-y-6" aria-label="登录注册入口表单">
                {/* 手机号（第一阶段显示） */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    手机号
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="请输入你的手机号码"
                    className={`w-full h-12 px-4 rounded-lg border focus:ring-2 outline-none transition ${phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-green-600 focus:ring-green-100'}`}
                    aria-required="true"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhone(val);
                      validatePhone(val);
                    }}
                    onBlur={() => validatePhone(phone)}
                  />
                  {/* 错误提示，始终渲染内容（为空则不显示文字） */}
                  <p className={`text-sm ${phoneError ? 'text-red-600' : 'text-gray-500'}`}>{phoneError}</p>
                </div>

                {/* 第二阶段潜在UI元素（默认隐藏）：放在手机号下方、“继续”按钮上方 */}
                <div
                  className={`${showSecondStage ? '' : 'hidden'} space-y-6`}
                  aria-hidden={!showSecondStage}
                >
                  {/* 登录部分：密码输入框（带眼睛图标） */}
                  <div className="space-y-2">
                    <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700">
                      密码
                    </label>
                    <div className="relative">
                      <input
                        id="loginPassword"
                        name="loginPassword"
                        type={loginPwVisible ? 'text' : 'password'}
                        placeholder="请输入密码"
                        className="w-full h-12 pr-12 px-4 rounded-lg border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none transition"
                      />
                      {/* 眼睛图标按钮：可点击切换密码可见性 */}
                      <button
                        type="button"
                        aria-label={loginPwVisible ? '隐藏密码' : '显示密码'}
                        aria-pressed={loginPwVisible}
                        onClick={() => setLoginPwVisible(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      >
                        {loginPwVisible ? (
                          // 斜线眼睛（隐藏）
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                            <path d="M3 3l18 18" />
                          </svg>
                        ) : (
                          // 眼睛（显示）
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 注册部分：设置密码（带眼睛图标 + 强度指示器） */}
                  <div className="space-y-2">
                    <label htmlFor="setPassword" className="block text-sm font-medium text-gray-700">
                      设置密码
                    </label>
                    <div className="relative">
                      <input
                        id="setPassword"
                        name="setPassword"
                        type={setPwVisible ? 'text' : 'password'}
                        placeholder="请设置密码"
                        className="w-full h-12 pr-12 px-4 rounded-lg border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none transition"
                      />
                      {/* 眼睛图标按钮：可点击切换密码可见性 */}
                      <button
                        type="button"
                        aria-label={setPwVisible ? '隐藏密码' : '显示密码'}
                        aria-pressed={setPwVisible}
                        onClick={() => setSetPwVisible(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      >
                        {setPwVisible ? (
                          // 斜线眼睛（隐藏）
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                            <path d="M3 3l18 18" />
                          </svg>
                        ) : (
                          // 眼睛（显示）
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* 密码强度指示器（静态装饰） */}
                    <div className="space-y-1" aria-live="polite" aria-atomic="true">
                      <div className="h-1 w-full bg-gray-200 rounded">
                        <div className="h-1 w-1/3 bg-yellow-400 rounded transition" />
                      </div>
                      <p className="text-xs text-gray-500">密码强度：中</p>
                    </div>
                  </div>

                  {/* 注册部分：确认密码（带眼睛图标） */}
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      确认密码
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={confirmPwVisible ? 'text' : 'password'}
                        placeholder="请再次输入密码"
                        className="w-full h-12 pr-12 px-4 rounded-lg border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none transition"
                      />
                      {/* 眼睛图标按钮：可点击切换密码可见性 */}
                      <button
                        type="button"
                        aria-label={confirmPwVisible ? '隐藏密码' : '显示密码'}
                        aria-pressed={confirmPwVisible}
                        onClick={() => setConfirmPwVisible(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      >
                        {confirmPwVisible ? (
                          // 斜线眼睛（隐藏）
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                            <path d="M3 3l18 18" />
                          </svg>
                        ) : (
                          // 眼睛（显示）
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 用户协议勾选框 */}
                  <div className="flex items-start gap-3">
                    <input
                      id="agree"
                      name="agree"
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label htmlFor="agree" className="text-sm text-gray-600 select-none">
                      我已阅读并同意
                      <a href="#" className="text-green-600 hover:underline ml-1">
                        《用户服务协议》
                      </a>
                    </label>
                  </div>
                </div>

                {/* 主操作按钮（第一阶段显示） */}
                <button
                  type="button"
                  onClick={() => setShowSecondStage(true)}
                  disabled={!canContinue}
                  className={`w-full h-12 rounded-xl text-white text-lg font-medium shadow-sm transition ${canContinue ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  继续
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* 隐藏 Edge/IE 自带的密码显示按钮，避免与自定义小眼睛重复 */}
      <style jsx global>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
      `}</style>
    </main>
  );
}

// 左侧功能点小组件
function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
        {/* 对勾图标 */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-sm text-gray-600 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}