import { createClient } from '@supabase/supabase-js'

// Cloudflare Pages Function: handle POST /api/auth/signup
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

    // 2) 从服务端环境变量读取 Supabase 配置（必须在 Cloudflare Pages 上配置）
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          message: '服务端环境变量未配置：请在 Cloudflare Pages 项目设置的 Environment Variables 中配置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3) 初始化 Supabase 服务端客户端（使用 Service Role Key）
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 4) 分支处理：仅手机号注册走 Admin 路径以绕过 OTP 验证，邮箱注册保持标准流程
    if (phone) {
      // 使用 Admin SDK 创建已验证的手机号用户（必须使用 Service Role Key，严禁在前端使用）
      const { data, error } = await supabase.auth.admin.createUser({
        phone,
        password,
        phone_confirm: true, // 直接标记为已验证，跳过短信 OTP
      })

      // 5) 处理 Supabase 返回的结果
      if (error) {
        return new Response(
          JSON.stringify({ message: '注册失败', error: error.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          message: '注册成功',
          userId: data.user?.id ?? null,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      // 邮箱注册仍使用标准 signUp（是否需要邮件验证由项目设置决定）
      const { data, error } = await supabase.auth.signUp({ email, password } as any)

      if (error) {
        return new Response(
          JSON.stringify({ message: '注册失败', error: error.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          message: '注册成功',
          userId: data.user?.id ?? null,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: e?.message ?? 'unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}