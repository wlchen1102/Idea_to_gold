// 点子广场接口
import { createClient } from '@supabase/supabase-js'
import type { CloudflareContext, CreateCreativeResponse, CreativesResponse, Creative } from '../../types'

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

// GET /api/creatives 列出创意
export async function onRequestGet(context: CloudflareContext): Promise<Response> {
  try {
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ message: '服务端环境变量未配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { global: { fetch } })

    // 简单列表，可根据需要添加分页、排序
    const { data, error } = await supabase
      .from('user_creatives')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return new Response(
        JSON.stringify({ message: '查询创意失败', error: error.message } satisfies Partial<CreativesResponse>),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const creatives = (data || []) as unknown as Creative[]

    return new Response(
      JSON.stringify({ message: '获取创意列表成功', creatives } satisfies CreativesResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return new Response(JSON.stringify({ message: '服务器内部错误', error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// POST /api/creatives 创建创意
export async function onRequestPost(context: CloudflareContext): Promise<Response> {
  try {
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ message: '服务端环境变量未配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const authHeader = context.request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) {
      return new Response(
        JSON.stringify({ message: '缺少认证令牌，请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { global: { fetch } })

    // 验证 token 并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ message: '认证令牌无效，请重新登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 字段校验
    const body = await context.request.json().catch(() => null) as { title?: string; description?: string; terminals?: string[]; bounty_amount?: number } | null
    if (!body?.title || !body?.description) {
       return new Response(
         JSON.stringify({ message: '缺少必填字段：title 或 description' }),
         { status: 400, headers: { 'Content-Type': 'application/json' } }
       )
     }

    // 生成唯一的 slug
    const baseSlug = slugifyTitle(body.title)
    const uniqueSlug = makeSlugUnique(baseSlug)

    const insertPayload = {
      title: body.title,
      description: body.description,
      author_id: user.id, // 从认证用户中获取
      slug: uniqueSlug,
      // 从请求体获取，提供默认值
      terminals: Array.isArray(body.terminals) ? body.terminals : [],
      bounty_amount: typeof body.bounty_amount === 'number' ? body.bounty_amount : 0,
    }

    const { data, error } = await supabase
      .from('user_creatives')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ message: '创建创意失败', error: error.message } satisfies Partial<CreateCreativeResponse>),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const created = data as unknown as Creative

    return new Response(
      JSON.stringify({ message: '创建成功', author_id: created.author_id, slug: created.slug } satisfies CreateCreativeResponse),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return new Response(JSON.stringify({ message: '服务器内部错误', error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}