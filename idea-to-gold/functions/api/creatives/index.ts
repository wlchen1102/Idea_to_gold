import { createClient } from '@supabase/supabase-js'

// 简易 slug 生成：与前端 src/lib/slug.ts 保持一致的规则
function slugifyTitle(title: string): string {
  return String(title)
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u4e00-\u9fa5\w\-]/g, '')
    .toLowerCase()
}

// 生成短随机后缀，降低冲突概率，例如 "ai-helper-x3f8a"
function makeSlugUnique(base: string): string {
  const rand = Math.random().toString(36).slice(2, 7) // 5位随机字符串
  return `${base}-${rand}`
}

// Cloudflare Pages Function: handle GET /api/creatives - 获取创意列表
export async function onRequestGet(context: any): Promise<Response> {
  try {
    // 1) 从服务端环境变量读取 Supabase 配置
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

    // 2) 初始化 Supabase 服务端客户端
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 3) 查询创意列表，按创建时间倒序排列，并关联作者的昵称与头像
    const { data, error } = await supabase
      .from('user_creatives')
      .select(`
        id,
        title,
        description,
        terminals,
        bounty_amount,
        created_at,
        author_id,
        slug,
        profiles (
          nickname,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return new Response(
        JSON.stringify({ message: '获取创意列表失败', error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // 4) 返回创意列表
    return new Response(
      JSON.stringify({ 
        message: '获取创意列表成功', 
        creatives: data || []
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: e?.message ?? 'unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }
}

// Cloudflare Pages Function: handle POST /api/creatives
export async function onRequestPost(context: any): Promise<Response> {
  try {
    // 1) 从服务端环境变量读取 Supabase 配置（必须在 Cloudflare Pages 项目设置中配置）
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

    // 2) 初始化 Supabase 服务端客户端（使用 Service Role Key）
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 3) 从请求头获取 Authorization token 并验证用户身份
    const authHeader = context.request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ message: '未提供有效的访问令牌，请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    
    // 使用服务端客户端验证 JWT token 并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ message: '访问令牌无效或已过期，请重新登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // 4) 解析请求体，获取创意数据
    const body = await context.request.json().catch(() => null)
    const title = body?.title
    const description = body?.description
    const terminals = body?.terminals // 允许为任意可序列化类型（如字符串、数组、对象）
    const bounty_amount = body?.bounty_amount || 0 // 悬赏金额，默认为0

    if (!title || !description) {
      return new Response(
        JSON.stringify({ message: '缺少必填字段：title 或 description' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // 5) 基于标题生成唯一 slug（base + 随机后缀）
    const baseSlug = slugifyTitle(String(title))
    const slug = makeSlugUnique(baseSlug)

    // 6) 写入数据库：user_creatives 表
    //    使用从 JWT 中验证得到的 user.id 作为 author_id，确保安全性
    const { error } = await supabase
      .from('user_creatives')
      .insert([
        {
          title,
          description,
          terminals,
          bounty_amount,
          slug, // 新增：存入生成的唯一 slug
          author_id: user.id, // 从验证后的 JWT 中获取，安全可靠
        },
      ])

    if (error) {
      return new Response(
        JSON.stringify({ message: '创建创意失败', error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // 7) 返回成功响应
    return new Response(
      JSON.stringify({ message: '创意创建成功', author_id: user.id, slug }),
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: e?.message ?? 'unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }
}