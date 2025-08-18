import { createClient } from '@supabase/supabase-js'

// 更新当前登录用户的公开资料（昵称、简介）
// 路由：PATCH /api/users/me/profile
export async function onRequestPatch(context: any): Promise<Response> {
  try {
    // 1) 读取服务端环境变量并初始化服务端 Supabase 客户端
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ message: '服务端环境变量未配置：请配置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 2) 从请求头中读取并验证 JWT 令牌，获取 user.id
    const authHeader = context.request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ message: '未提供有效的访问令牌，请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ message: '访问令牌无效或已过期，请重新登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // 3) 解析请求体，读取 nickname 与 bio（PATCH 语义：允许部分字段更新）
    const body = await context.request.json().catch(() => null)
    const nickname = body?.nickname
    const bio = body?.bio

    const updateData: Record<string, any> = {}
    if (typeof nickname !== 'undefined') updateData.nickname = nickname
    if (typeof bio !== 'undefined') updateData.bio = bio

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ message: '未提供需要更新的字段' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // 4) 更新数据库，仅允许更新自己 id 对应的那一行
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      return new Response(
        JSON.stringify({ message: '更新资料失败', error: updateError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // 5) 返回成功响应
    return new Response(
      JSON.stringify({ message: '更新成功' }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: e?.message ?? 'unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }
}