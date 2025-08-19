import { createClient } from '@supabase/supabase-js'
import type { CloudflareContext, AuthResponse } from '../../types'

// Cloudflare Pages Function: handle POST /api/auth/login
export async function onRequestPost(context: CloudflareContext): Promise<Response> {
  try {
    // 1) 解析请求体
    const body = await context.request.json().catch(() => null) as { phone?: string; email?: string; password?: string } | null
    const phone = body?.phone
    const email = body?.email
    const password = body?.password

    if ((!phone && !email) || !password) {
      return new Response(
        JSON.stringify({ message: '缺少必填字段：email/phone 和 password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2) 从服务端环境变量读取 Supabase 配置
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          message: '服务端环境变量未配置：请配置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3) 初始化 Supabase 服务端客户端（使用 Service Role Key）
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 4) 使用邮箱或手机号 + 密码登录（分别调用以满足重载类型要求）
    const signInResult = phone
      ? await supabase.auth.signInWithPassword({ phone, password: password as string })
      : await supabase.auth.signInWithPassword({ email: email as string, password: password as string })
    const { data, error } = signInResult

    if (error) {
      return new Response(
        JSON.stringify({ message: '登录失败', error: error.message }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const resp: AuthResponse = {
      message: '登录成功',
      userId: data.user?.id ?? null,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at ?? undefined,
          }
        : null,
    }

    return new Response(
      JSON.stringify(resp),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}