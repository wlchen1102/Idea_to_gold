// 登录/注册入口页面 - 根据手机号或邮箱智能分流
// 流程说明：
// 1. 选择输入类型（手机号/邮箱），输入后点击"继续" → 调用 /api/auth/check-phone 或 /api/auth/check-email 检查是否存在
// 2. 如果账号存在 → 显示密码输入框 + "登录"按钮
// 3. 如果账号不存在 → 显示昵称输入框 + 设置密码 + 确认密码 + "注册"按钮

'use client'
// 在文件的最顶部添加这一行
export const runtime = 'edge';
export const dynamic = 'force-dynamic'

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation'
import { requireSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  // 移除未使用的变量： step, setStep, setInputType
  const [inputType] = useState<'phone' | 'email'>('phone'); // 输入类型（保留但移除setter）
  const [phone, setPhone] = useState(''); // 手机号（仅输入11位数字）
  const [email] = useState(''); // 邮箱（仅用于判定与构建凭证，当前未暴露 setter）
  // 移除未使用的变量： email, setEmail, emailError, setEmailError
  const [phoneError, setPhoneError] = useState(''); // 手机号错误信息
  const [password, setPassword] = useState(''); // 登录密码
  const [nickname, setNickname] = useState(''); // 注册昵称
  const [newPassword, setNewPassword] = useState(''); // 注册-设置密码
  const [confirmPassword, setConfirmPassword] = useState(''); // 注册-确认密码
  const [pwVisible, setPwVisible] = useState(false); // 密码是否可见
  const [newPwVisible, setNewPwVisible] = useState(false); // 设置密码是否可见
  const [confirmPwVisible, setConfirmPwVisible] = useState(false); // 确认密码是否可见
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [switchingMessage, setSwitchingMessage] = useState(''); // 切换提示信息
  const [nicknameError, setNicknameError] = useState(''); // 昵称校验错误信息
  const [termsAccepted, setTermsAccepted] = useState(false); // 用户协议勾选状态
  const [mode, setMode] = useState<'login' | 'signup'>('login'); // 登录/注册模式切换
  const router = useRouter();
  const searchParams = useSearchParams();

  // 失焦延迟校验计时器（手机号）
  const phoneBlurTimer = useRef<NodeJS.Timeout | null>(null);

  // 根据 URL 查询参数初始化展示模式，例如 /login?mode=signup 直接展示注册页
  useEffect(() => {
    try {
      const m = (searchParams?.get('mode') || searchParams?.get('tab') || '').toLowerCase();
      if (m === 'signup' || m === 'register') setMode('signup');
      else if (m === 'login') setMode('login');
    } catch {}
    // 仅在首次挂载时读取一次
  }, [searchParams]); // 修复：添加缺失的依赖

  useEffect(() => {
    // 组件卸载时清理定时器
    return () => { if (phoneBlurTimer.current) clearTimeout(phoneBlurTimer.current); };
  }, []);

  // 中国大陆手机号：以1开头，第2位3-9，总共11位
  const CN_PHONE_REGEX = /^1[3-9]\d{9}$/;
  
  // 邮箱正则表达式（暂时保留，可能后续会用到）
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 将11位中国大陆手机号转换为E.164格式（+86开头）。若已是+开头则原样返回。
  const toE164 = (raw: string) => {
    const s = (raw || '').trim();
    if (!s) return s;
    return s.startsWith('+') ? s : `+86${s}`;
  };

  // 昵称实时校验：2-15个字符
  const validateNickname = (value: string) => {
    const v = (value || '').trim();
    if (v.length === 0) {
      setNicknameError('昵称为必填项');
      return false;
    }
    if (v.length < 2 || v.length > 15) {
      setNicknameError('昵称长度需在 2-15 个字符之间');
      return false;
    }
    setNicknameError('');
    return true;
  };

  const validatePhone = (value: string) => {
    const v = value.trim();
    const ok = CN_PHONE_REGEX.test(v);
    setPhoneError(ok || v === '' ? '' : '请输入一个有效的11位手机号码');
    return ok;
  };

  const isPhoneValid = CN_PHONE_REGEX.test(phone.trim());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isEmailValid = EMAIL_REGEX.test(email.trim());

  // 统一：调度"手机号失焦0.5秒后自动校验是否存在"
  const schedulePhoneExistenceCheck = (currentMode: 'login' | 'signup') => {
    if (phoneBlurTimer.current) clearTimeout(phoneBlurTimer.current);
    // 只有输入了有效手机号时才调度
    if (!CN_PHONE_REGEX.test(phone.trim())) return;

    phoneBlurTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: toE164(phone) })
        });
        const data = await res.json().catch(() => ({}));
        if (!CN_PHONE_REGEX.test(phone.trim())) return; // 若期间用户已修改为非法值，忽略

        if (res.ok) {
          const exists = !!(data as { exists?: boolean }).exists;
          if (exists) {
            // 已注册
            if (currentMode === 'signup') {
              // 先显示错误提示
              setPhoneError('手机号已注册，请直接登录');
              // 1秒后显示切换提示并切换到登录页
              setTimeout(() => {
                setSwitchingMessage('正在为您跳转登录页...');
                setTimeout(() => {
                  setMode('login');
                  setPhoneError('');
                  setSubmitError('');
                  setSuccessMessage('');
                  setSwitchingMessage('');
                  // 清空注册相关字段
                  setNewPassword('');
                  setConfirmPassword('');
                  setNickname('');
                  setNicknameError('');
                  setTermsAccepted(false);
                }, 1200); // 切换提示显示1.2秒后执行切换
              }, 1000); // 错误提示显示1秒后开始切换流程
            } else {
              setPhoneError('');
            }
          } else {
            // 未注册
            if (currentMode === 'login') {
              // 先显示错误提示
              setPhoneError('手机号未注册，请先注册');
              // 1秒后显示切换提示并切换到注册页
              setTimeout(() => {
                setSwitchingMessage('正在为您跳转注册页...');
                setTimeout(() => {
                  setMode('signup');
                  setPhoneError('');
                  setSubmitError('');
                  setSuccessMessage('');
                  setSwitchingMessage('');
                  // 清空登录相关字段
                  setPassword('');
                }, 1200); // 切换提示显示1.2秒后执行切换
              }, 1000); // 错误提示显示1秒后开始切换流程
            } else {
              setPhoneError('');
            }
          }
        }
      } catch {
        // 静默失败：不影响用户继续
      }
    }, 500);
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

      // 改为在前端直接使用 supabase-js 登录，由 SDK 负责管理会话
      const credentials = inputType === 'phone'
        ? { phone: toE164(phone), password }
        : { email: email.trim(), password };

      const supabase = requireSupabaseClient();
      // 修复：明确类型而不是使用 any
      const { data, error } = await supabase.auth.signInWithPassword(credentials as { phone: string; password: string } | { email: string; password: string });

      if (error) {
        const msg = error.message || '登录失败，请检查密码';
        if (inputType === 'phone' && typeof msg === 'string' && msg.toLowerCase().includes('invalid login credentials')) {
          setSubmitError('手机号未注册，请先注册');
        } else {
          setSubmitError(msg);
        }
        return;
      }

      setSuccessMessage('登录成功！正在跳转...');

      // 设置本地登录态 - 仅在浏览器环境中执行
      if (typeof window !== 'undefined') {
        localStorage.setItem('isLoggedIn', 'true');
        try {
          const uid = data?.user?.id;
          if (uid) {
            localStorage.setItem('userId', String(uid));
          } else {
            localStorage.removeItem('userId');
          }
        } catch {}
      }

      // 通知全局监听者（Header/AvatarMenu）更新登录态 - 仅在浏览器环境中执行
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:changed'));
      }

      setTimeout(() => {
        router.push('/creatives');
      }, 1200);
    } catch (e) {
      const error = e as Error;
      setSubmitError(error?.message || '网络异常，请稍后重试');
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
        ? { phone: toE164(phone), password: newPassword, nickname: nickname.trim() || undefined }
        : { email: email.trim(), password: newPassword, nickname: nickname.trim() || undefined };

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && (res.status === 201 || res.status === 200)) {
        setSuccessMessage('注册成功！正在跳转...');
        
        // 设置本地登录态 - 仅在浏览器环境中执行
        if (typeof window !== 'undefined') {
          localStorage.setItem('isLoggedIn', 'true');
          
          // 保存当前用户ID（来自后端返回）
          try {
            const uid = (data as { userId?: string | number }).userId;
            if (uid) {
              localStorage.setItem('userId', String(uid));
            } else {
              localStorage.removeItem('userId');
            }
          } catch {}
        }

        // 【关键修复】注册成功后，用相同的账号密码创建 Supabase 会话
        try {
          const credentials = inputType === 'phone'
            ? { phone: toE164(phone), password: newPassword }
            : { email: email.trim(), password: newPassword };
        
          const supabase = requireSupabaseClient();
          const { error: signInErr } = await supabase.auth.signInWithPassword(credentials as { phone: string; password: string } | { email: string; password: string });
          if (signInErr) {
            console.warn('注册后自动登录失败:', signInErr);
          }
        } catch (e) {
          console.warn('设置 Supabase 会话失败:', e);
        }

        setTimeout(() => {
          router.push('/creatives');
        }, 1200);
      } else {
        // 直接使用服务端归一化后的中文 message
        setSubmitError((data as { message?: string }).message || '注册失败，请稍后重试');
      }
    } catch (e) {
      const err = e as Error;
      setSubmitError(err?.message || '网络异常，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* 左侧：卖点与价值主张 */}
          <aside className="order-2 lg:order-1">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                点亮你的
                <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent"> AI创意</span>
                ，让世界看到你的创造
              </h2>
              <p className="text-gray-600 leading-7">
                一个连接真实需求与顶尖AI开发者的孵化平台。在这里，每个好创意都能&quot;点石成金&quot;。
              </p>

              <div className="mt-4 space-y-4">
                <FeatureItem title="AI需求分析师" desc="多轮对话澄清需求，自动生成可执行方案" />
                <FeatureItem title="透明化的项目空间" desc="阶段式进度与开发日志，实时可见" />
                <FeatureItem title="社区驱动的价值发现" desc="&apos;我也要&apos;投票，真实市场信号" />
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
                  {mode === 'login' ? '欢迎回来，请输入手机号和密码登录。' : '欢迎创建新账户'}
                </p>
              </header>

              {/* 成功提示 Toast */}
              {successMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
                  {successMessage}
                </div>
              )}

              {/* 切换提示 Toast */}
              {switchingMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
                  {switchingMessage}
                </div>
              )}

              {/* 错误提示 */}
              {submitError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {submitError}
                </div>
              )}

              {/* 表单区域（动态切换：登录/注册） */}
              <form className="space-y-6" aria-label="登录注册表单" onSubmit={(e) => e.preventDefault()}>
                {/* 使用条件渲染取代表单面板的绝对定位，避免高度被裁剪 */}
                {mode === 'login' ? (
                  <div className="space-y-4">
                    {/* 手机号输入 */}
                    <div className="space-y-2">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">手机号</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none">+86</span>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          inputMode="numeric"
                          placeholder="请输入你的手机号码"
                          className={`w-full h-12 pl-14 pr-4 rounded-lg border focus:ring-2 outline-none transition ${
                            phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-green-600 focus:ring-green-100'
                          }`}
                          value={phone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhone(val);
                            validatePhone(val);
                            setPhoneError('');
                            if (phoneBlurTimer.current) clearTimeout(phoneBlurTimer.current);
                          }}
                          onFocus={() => { if (phoneBlurTimer.current) clearTimeout(phoneBlurTimer.current); }}
                          onBlur={() => { if (validatePhone(phone)) schedulePhoneExistenceCheck('login'); }}
                          disabled={isSubmitting}
                          maxLength={11}
                        />
                      </div>
                      {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                    </div>

                    {/* 密码输入 */}
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
                        disabled={!isPhoneValid || !password || password.length < 6 || isSubmitting}
                        aria-busy={isSubmitting}
                        className={`w-full h-11 rounded-lg font-medium text-white transition ${(!isPhoneValid || !password || password.length < 6 || isSubmitting) ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-200'}`}
                      >
                        {isSubmitting ? '登录中…' : '登录'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 手机号输入 */}
                    <div className="space-y-2">
                      <label htmlFor="phone-signup" className="block text-sm font-medium text-gray-700">手机号</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none">+86</span>
                        <input
                          id="phone-signup"
                          name="phone-signup"
                          type="tel"
                          inputMode="numeric"
                          placeholder="请输入你的手机号码"
                          className={`w-full h-12 pl-14 pr-4 rounded-lg border focus:ring-2 outline-none transition ${
                            phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-green-600 focus:ring-green-100'
                          }`}
                          value={phone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhone(val);
                            validatePhone(val);
                            setPhoneError('');
                            if (phoneBlurTimer.current) clearTimeout(phoneBlurTimer.current);
                          }}
                          onFocus={() => { if (phoneBlurTimer.current) clearTimeout(phoneBlurTimer.current); }}
                          onBlur={() => { if (validatePhone(phone)) schedulePhoneExistenceCheck('signup'); }}
                          disabled={isSubmitting}
                          maxLength={11}
                        />
                      </div>
                      {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
                    </div>

                    {/* 昵称输入 */}
                    <div className="space-y-2">
                      <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">昵称 <span className="text-red-500">*</span></label>
                      <input
                        id="nickname"
                        name="nickname"
                        type="text"
                        placeholder="请输入昵称"
                        className={`w-full h-12 px-3 rounded-lg border focus:ring-2 outline-none transition ${nicknameError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-green-600 focus:ring-green-100'}`}
                        value={nickname}
                        onChange={(e) => { const v = e.target.value; setNickname(v); validateNickname(v); }}
                        onBlur={(e) => validateNickname(e.target.value)}
                        disabled={isSubmitting}
                        maxLength={15}
                      />
                      {nicknameError && <p className="text-xs text-red-500">{nicknameError}</p>}
                    </div>

                    {/* 设置密码 */}
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

                    {/* 确认密码 */}
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

                    {/* 协议 */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        id="terms"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="terms">我已阅读并同意 <a href="#" className="text-emerald-600 hover:underline">用户协议</a> 与 <a href="#" className="text-emerald-600 hover:underline">隐私政策</a></label>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSignup}
                        disabled={(!isPhoneValid || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword || !!nicknameError || !nickname.trim() || !termsAccepted) || isSubmitting}
                        aria-busy={isSubmitting}
                        className={`w-full h-11 rounded-lg font-medium text-white transition ${((!isPhoneValid || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword || !!nicknameError || !nickname.trim() || !termsAccepted) || isSubmitting) ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-200'}`}
                      >
                        {isSubmitting ? '注册中…' : '注册'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 底部模式切换引导 */}
                <div className="text-center text-sm text-gray-600">
                  {mode === 'login' ? (
                    <>
                      还没有账号？
                      <button
                        type="button"
                        onClick={() => { setMode('signup'); setSubmitError(''); setSuccessMessage(''); setPassword(''); }}
                        className="ml-1 text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        立即注册
                      </button>
                    </>
                  ) : (
                    <>
                      已有账号？
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setSubmitError(''); setSuccessMessage(''); setNewPassword(''); setConfirmPassword(''); }}
                        className="ml-1 text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        返回登录
                      </button>
                    </>
                  )}
                </div>
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