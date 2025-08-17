import { createClient } from '@supabase/supabase-js'

// Cloudflare Pages Function: handle GET /api/creatives/[id] - 获取单个创意详情（按 id 查询）
export async function onRequestGet(context: any): Promise<Response> {
  try {
    // 1) 从 URL 路径中获取创意 id（字符串即可；为稳妥仍解码一次）
    const rawId = context.params?.id
    const creativeId = typeof rawId === 'string' ? decodeURIComponent(rawId) : ''
    if (!creativeId) {
      return new Response(
        JSON.stringify({ message: '缺少创意 id 参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
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
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // 3) 初始化 Supabase 服务端客户端
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 4) 查询指定 id 的创意，并关联作者信息
    const { data, error } = await supabase
      .from('user_creatives')
      .select(`
        id,
        slug,
        title,
        description,
        terminals,
        bounty_amount,
        created_at,
        author_id,
        profiles (
          nickname,
          avatar_url
        )
      `)
      .eq('id', creativeId)
      .limit(1)

    if (error) {
      return new Response(
        JSON.stringify({ message: '查询创意失败', error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ message: '未找到对应的创意', id: creativeId }),
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    return new Response(
      JSON.stringify({ message: '获取创意详情成功', creative: data[0] }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: e?.message ?? 'unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }
}