import { createClient } from '@supabase/supabase-js'

// Cloudflare Pages Function: handle POST /api/auth/check-phone
// 检查手机号是否已经注册
export async function onRequestPost(context: any): Promise<Response> {
  try {
    // 1) 解析请求体
    const body = await context.request.json().catch(() => null)
    const phone = body?.phone

    if (!phone) {
      return new Response(
        JSON.stringify({ message: '缺少必填字段：phone' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2) 从服务端环境变量读取 Supabase 配置
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          message: '服务端环境变量未配置',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3) 初始化 Supabase 服务端客户端（使用 Service Role Key）
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 4) 使用 Auth Admin API 查询用户是否存在
    // 注意：这里使用 listUsers 并筛选手机号，而不是直接查询 auth.users 表
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error) {
      return new Response(
        JSON.stringify({ message: '查询失败', error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 5) 检查是否存在该手机号的用户
    const existingUser = users?.users?.find(user => user.phone === phone)
    const exists = !!existingUser

    return new Response(
      JSON.stringify({
        exists,
        message: exists ? '手机号已注册' : '手机号可用于注册'
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