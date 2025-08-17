// 登录/注册入口页面 - 根据手机号或邮箱智能分流
// 流程说明：
// 1. 选择输入类型（手机号/邮箱），输入后点击"继续" → 调用 /api/auth/check-phone 或 /api/auth/check-email 检查是否存在
// 2. 如果账号存在 → 显示密码输入框 + "登录"按钮
// 3. 如果账号不存在 → 显示设置密码 + 确认密码 + "注册"按钮

'use client'

import React, { useState } from "react";
import { useRouter } from 'next/navigation'
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'login' | 'signup'>('phone'); // 当前步骤
  const [inputType, setInputType] = useState<'phone' | 'email'>('phone'); // 输入类型
  const [phone, setPhone] = useState(''); // 手机号（仅输入11位数字）
  const [email, setEmail] = useState(''); // 邮箱
  const [phoneError, setPhoneError] = useState(''); // 手机号错误信息
  const [emailError, setEmailError] = useState(''); // 邮箱错误信息
  const [password, setPassword] = useState(''); // 登录密码
  const [newPassword, setNewPassword] = useState(''); // 注册-设置密码
  const [confirmPassword, setConfirmPassword] = useState(''); // 注册-确认密码
  const [pwVisible, setPwVisible] = useState(false); // 密码是否可见
  const [newPwVisible, setNewPwVisible] = useState(false); // 设置密码是否可见
  const [confirmPwVisible, setConfirmPwVisible] = useState(false); // 确认密码是否可见
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  // 中国大陆手机号：以1开头，第2位3-9，总共11位
  const CN_PHONE_REGEX = /^1[3-9]\d{9}$/;
  
  // 邮箱正则表达式
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 将11位中国大陆手机号转换为E.164格式（+86开头）。若已是+开头则原样返回。
  const toE164 = (raw: string) => {
    const s = (raw || '').trim();
    if (!s) return s;
    return s.startsWith('+') ? s : `+86${s}`;
  };

  const validatePhone = (value: string) => {
    const v = value.trim();
    const ok = CN_PHONE_REGEX.test(v);
    setPhoneError(ok || v === '' ? '' : '请输入一个有效的11位手机号码');
    return ok;
  };

  const validateEmail = (value: string) => {
    const v = value.trim();
    const ok = EMAIL_REGEX.test(v);
    setEmailError(ok || v === '' ? '' : '请输入一个有效的邮箱地址');
    return ok;
  };

  const isPhoneValid = CN_PHONE_REGEX.test(phone.trim());
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  
  const getCurrentInput = () => inputType === 'phone' ? phone : email;
  const isCurrentInputValid = () => inputType === 'phone' ? isPhoneValid : isEmailValid;
  const canContinue = getCurrentInput().trim() !== '' && isCurrentInputValid();

  // 检查账号是否存在（手机号或邮箱）
  const handleContinue = async () => {
    const isValid = inputType === 'phone' ? validatePhone(phone) : validateEmail(email);
    if (!isValid) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const endpoint = inputType === 'phone' ? '/api/auth/check-phone' : '/api/auth/check-email';
      const body = inputType === 'phone' 
        ? { phone: toE164(phone) }
        : { email: email.trim() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({} as any));

      if (res.ok) {
        if ((data as any).exists) {
          // 账号已注册，进入登录流程
          setStep('login');
        } else {
          // 账号未注册，进入注册流程
          setStep('signup');
        }
      } else {
        setSubmitError((data as any).error || (data as any).message || '检查账号失败，请稍后再试');
      }
    } catch (e: any) {
      setSubmitError(e?.message || '网络异常，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 登录提交
  const handleLogin = async () => {
    if (!password) {
      setSubmitError('请输入密码');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const body = inputType === 'phone' 
        ? { phone: toE164(phone), password }
        : { email: email.trim(), password };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({} as any));

      if (res.ok) {
        setSuccessMessage('登录成功！正在跳转...');
        
        // 设置本地登录态
        localStorage.setItem('isLoggedIn', 'true');
        
        // 保存当前用户ID（来自后端返回）
        try {
          const uid = (data as any)?.userId;
          if (uid) {
            localStorage.setItem('userId', String(uid));
          } else {
            localStorage.removeItem('userId');
          }
        } catch {}

        // 【关键修复】如果后端返回了 session，设置到 Supabase 客户端
        try {
          const session = (data as any)?.session;
          if (session?.access_token && session?.refresh_token) {
            await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token
            });
          }
        } catch (e) {
          console.warn('设置 Supabase 会话失败:', e);
        }
        
        // 通知全局监听者（Header/AvatarMenu）更新登录态
        window.dispatchEvent(new Event('auth:changed'));
        
        setTimeout(() => {
          router.push('/'); // 跳转到点子广场页面
        }, 1200);
      } else {
        setSubmitError((data as any).error || (data as any).message || '登录失败，请检查密码');
      }
    } catch (e: any) {
      setSubmitError(e?.message || '网络异常，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 注册提交
  const handleSignup = async () => {
    if (!newPassword || newPassword.length < 6) {
      setSubmitError('请设置至少6位的密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSubmitError('两次输入的密码不一致');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const body = inputType === 'phone' 
        ? { phone: toE164(phone), password: newPassword }
        : { email: email.trim(), password: newPassword };

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({} as any));

      if (res.ok && (res.status === 201 || res.status === 200)) {
        setSuccessMessage('注册成功！正在跳转...');
        
        // 设置本地登录态
        localStorage.setItem('isLoggedIn', 'true');
        
        // 保存当前用户ID（来自后端返回）
        try {
          const uid = (data as any)?.userId;
          if (uid) {
            localStorage.setItem('userId', String(uid));
          } else {
            localStorage.removeItem('userId');
          }
        } catch {}

        // 【关键修复】注册成功后，用相同的账号密码创建 Supabase 会话
        try {
          const credentials = inputType === 'phone' 
            ? { phone: toE164(phone), password: newPassword }
            : { email: email.trim(), password: newPassword };
          
          const { data: signInData, error } = await supabase.auth.signInWithPassword(credentials as any);
          
          if (error) {
            console.warn('注册后创建会话失败:', error);
          }
        } catch (e) {
          console.warn('注册后创建会话异常:', e);
        }
        
        // 通知全局监听者（Header/AvatarMenu）更新登录态
        window.dispatchEvent(new Event('auth:changed'));
        
        setTimeout(() => {
          router.push('/'); // 跳转到点子广场页面
        }, 1200);
      } else {
        setSubmitError((data as any).error || (data as any).message || '注册失败，请稍后再试');
      }
    } catch (e: any) {
      setSubmitError(e?.message || '网络异常，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 返回输入步骤
  const backToInputStep = () => {
    setStep('phone');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSubmitError('');
    setSuccessMessage('');
  };

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
                一个连接真实需求与顶尖AI开发者的孵化平台。在这里，每个好创意都能"点石成金"。
              </p>

              <div className="mt-4 space-y-4">
                <FeatureItem title="AI需求分析师" desc="多轮对话澄清需求，自动生成可执行方案" />
                <FeatureItem title="透明化的项目空间" desc="阶段式进度与开发日志，实时可见" />
                <FeatureItem title="社区驱动的价值发现" desc="'我也要'投票，真实市场信号" />
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
                <p className="mt-2 text-gray-600">
                  {step === 'phone' && '输入手机号或邮箱，开启你的创造之旅。'}
                  {step === 'login' && '欢迎回来，请输入密码登录。'}
                  {step === 'signup' && '创建新账户，设置你的密码。'}
                </p>
              </header>

              {/* 成功提示 Toast */}
              {successMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
                  {successMessage}
                </div>
              )}

              {/* 错误提示 */}
              {submitError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {submitError}
                </div>
              )}

              {/* 表单区域 */}
              <form className="space-y-6" aria-label="登录注册表单" onSubmit={(e) => e.preventDefault()}>
                
                {/* 输入类型选择 - 仅在初始输入步骤显示 */}
                {step === 'phone' && (
                  <div className="space-y-4">
                    {/* 输入类型切换 */}
                    <div className="flex rounded-lg bg-gray-100 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setInputType('phone');
                          setEmail('');
                          setEmailError('');
                        }}
                        className={`flex-1 rounded-md py-2.5 text-sm font-medium transition ${
                          inputType === 'phone'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        手机号
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInputType('email');
                          setPhone('');
                          setPhoneError('');
                        }}
                        className={`flex-1 rounded-md py-2.5 text-sm font-medium transition ${
                          inputType === 'email'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        邮箱
                      </button>
                    </div>

                    {/* 手机号输入 */}
                    {inputType === 'phone' && (
                      <div className="space-y-2">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          手机号
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none">+86</span>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="请输入你的手机号码"
                            className={`w-full h-12 pl-14 pr-4 rounded-lg border focus:ring-2 outline-none transition ${
                              phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 
                              'border-gray-300 focus:border-green-600 focus:ring-green-100'
                            }`}
                            value={phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPhone(val);
                              validatePhone(val);
                              setPhoneError('');
                            }}
                            onBlur={() => validatePhone(phone)}
                          />
                        </div>
                        {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                      </div>
                    )}

                    {/* 邮箱输入 */}
                    {inputType === 'email' && (
                      <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          邮箱
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="请输入你的邮箱地址"
                          className={`w-full h-12 px-3 rounded-lg border focus:ring-2 outline-none transition ${
                            emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 
                            'border-gray-300 focus:border-green-600 focus:ring-green-100'
                          }`}
                          value={email}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEmail(val);
                            validateEmail(val);
                            setEmailError('');
                          }}
                          onBlur={() => validateEmail(email)}
                        />
                        {emailError && <p className="text-sm text-red-600">{emailError}</p>}
                      </div>
                    )}

                    {/* 继续按钮 */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleContinue}
                        disabled={!canContinue || isSubmitting}
                        aria-busy={isSubmitting}
                        className={`w-full h-11 rounded-lg font-medium text-white transition
                          ${(!canContinue || isSubmitting)
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-200'}`}
                      >
                        {isSubmitting ? '检查中…' : '继续'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 已输入账号信息显示 - 在登录/注册步骤显示 */}
                {(step === 'login' || step === 'signup') && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          {inputType === 'phone' ? '手机号' : '邮箱'}
                        </p>
                        <p className="font-medium text-gray-900">
                          {inputType === 'phone' ? `+86 ${phone}` : email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={backToInputStep}
                        className="text-sm text-green-600 hover:text-green-700"
                      >
                        修改
                      </button>
                    </div>
                  </div>
                )}

                {/* 登录步骤：密码输入 */}
                {step === 'login' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={pwVisible ? 'text' : 'password'}
                          placeholder="请输入密码"
                          className="w-full h-12 pr-12 pl-3 rounded-lg border focus:ring-2 outline-none transition border-gray-300 focus:border-green-600 focus:ring-green-100"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setPwVisible(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          aria-label={pwVisible ? '隐藏密码' : '显示密码'}
                        >
                          <EyeIcon visible={pwVisible} />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleLogin}
                        disabled={!password || isSubmitting}
                        aria-busy={isSubmitting}
                        className={`w-full h-11 rounded-lg font-medium text-white transition
                          ${(!password || isSubmitting)
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-200'}`}
                      >
                        {isSubmitting ? '登录中…' : '登录'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 注册步骤：设置密码 */}
                {step === 'signup' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">设置密码</label>
                      <div className="relative">
                        <input
                          id="newPassword"
                          name="newPassword"
                          type={newPwVisible ? 'text' : 'password'}
                          placeholder="请输入至少6位密码"
                          className="w-full h-12 pr-12 pl-3 rounded-lg border focus:ring-2 outline-none transition border-gray-300 focus:border-green-600 focus:ring-green-100"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setNewPwVisible(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          aria-label={newPwVisible ? '隐藏密码' : '显示密码'}
                        >
                          <EyeIcon visible={newPwVisible} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">确认密码</label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={confirmPwVisible ? 'text' : 'password'}
                          placeholder="再次输入密码"
                          className="w-full h-12 pr-12 pl-3 rounded-lg border focus:ring-2 outline-none transition border-gray-300 focus:border-green-600 focus:ring-green-100"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setConfirmPwVisible(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          aria-label={confirmPwVisible ? '隐藏密码' : '显示密码'}
                        >
                          <EyeIcon visible={confirmPwVisible} />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSignup}
                        disabled={(!newPassword || newPassword.length < 6 || newPassword !== confirmPassword) || isSubmitting}
                        aria-busy={isSubmitting}
                        className={`w-full h-11 rounded-lg font-medium text-white transition
                          ${((!newPassword || newPassword.length < 6 || newPassword !== confirmPassword) || isSubmitting)
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-200'}`}
                      >
                        {isSubmitting ? '注册中…' : '注册'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* 隐藏 Edge/IE 自带的密码显示按钮 */}
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

// 眼睛图标组件
function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
        <path d="M3 3l18 18" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}