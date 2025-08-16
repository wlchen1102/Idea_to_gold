import { createClient } from '@supabase/supabase-js'

// Cloudflare Pages Function: handle POST /api/auth/login
export async function onRequestPost(context: any): Promise<Response> {
  try {
    // 1) 解析请求体
    const body = await context.request.json().catch(() => null)
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

    // 4) 使用邮箱或手机号 + 密码登录
    const credentials = phone ? { phone, password } : { email, password }
    const { data, error } = await supabase.auth.signInWithPassword(credentials as any)

    if (error) {
      return new Response(
        JSON.stringify({ message: '登录失败', error: error.message }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        message: '登录成功',
        userId: data.user?.id ?? null,
        session: data.session ?? null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: e?.message ?? 'unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}