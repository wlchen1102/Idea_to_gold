// Next.js Route Handler - 创意广场接口
// 迁移自 functions/api/creatives/index.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

// 使用 Edge Runtime
export const runtime = 'edge'

// 从 functions/types.ts 迁移而来的类型定义
interface Creative {
  id: string
  title: string
  description: string
  terminals: string[]
  bounty_amount: number
  created_at: string
  author_id: string
  slug: string
  upvote_count?: number // 新增：预先计算的点赞数缓存字段（方案A）
  profiles?: {
    nickname: string | null
    avatar_url: string | null
  } | null
}

interface CreativesResponse {
  message: string
  creatives?: Creative[]
  error?: string
}

interface CreateCreativeResponse {
  message: string
  author_id: string
  slug: string
  error?: string
}

// 简易 slug 生成：与原 functions 版本保持一致
function slugifyTitle(title: string): string {
  return String(title)
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u4e00-\u9fa5\w\-]/g, '')
    .toLowerCase()
}

// 生成短随机后缀，降低冲突概率
function makeSlugUnique(base: string): string {
  const rand = Math.random().toString(36).slice(2, 7) // 5位随机字符串
  return `${base}-${rand}`
}

// GET /api/creatives - 获取创意列表
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 获取环境变量
     const { supabaseUrl, serviceRoleKey } = getEnvVars()

     if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { message: '服务端环境变量未配置' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 获取查询参数
    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sort') || 'latest' // latest 或 popular
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)

    // 根据排序方式选择不同的RPC函数
    const rpcFunction = sortBy === 'popular' ? 'get_popular_creatives_with_counts' : 'get_all_creatives_with_counts'
    
    // 尝试使用优化的RPC函数一次性获取创意及其统计数据
    const { data: creativesWithStats, error: rpcError } = await supabaseAdmin.rpc(rpcFunction, {
      limit_count: limit,
      offset_count: offset
    })

    if (!rpcError && creativesWithStats) {
      const response = NextResponse.json({
        message: '获取创意列表成功',
        creatives: creativesWithStats,
        total: creativesWithStats.length
      } satisfies CreativesResponse)
      
      // 添加缓存头优化性能
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')
      response.headers.set('Content-Type', 'application/json; charset=utf-8')
      
      return response
    }

    // 如果RPC函数不存在，使用传统查询方式作为降级方案
    console.log('RPC函数不可用，使用传统查询方式:', rpcError?.message)
    
    const { data, error } = await supabaseAdmin
      .from('creatives')
      .select('*') // 包含 upvote_count 预计算字段
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { message: '查询创意失败', error: error.message } satisfies Partial<CreativesResponse>,
        { status: 500 }
      )
    }

    const creatives = (data || []) as unknown as Creative[]

    return NextResponse.json(
      { message: '获取创意列表成功', creatives } satisfies CreativesResponse,
      { status: 200 }
    )
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return NextResponse.json(
      { message: '服务器内部错误', error: msg },
      { status: 500 }
    )
  }
}

// POST /api/creatives - 创建新创意
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 获取环境变量
     const { supabaseUrl, serviceRoleKey } = getEnvVars()

     if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { message: '服务端环境变量未配置' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) {
      return NextResponse.json(
        { message: '缺少认证令牌，请先登录' },
        { status: 401 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 验证 token 并获取用户信息
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { message: '认证令牌无效，请重新登录' },
        { status: 401 }
      )
    }

    // 字段校验
    const body = await request.json().catch(() => null) as { 
      title?: string
      description?: string
      terminals?: string[]
      bounty_amount?: number 
    } | null

    if (!body?.title || !body?.description) {
      return NextResponse.json(
        { message: '缺少必填字段：title 或 description' },
        { status: 400 }
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

    const { data, error } = await supabaseAdmin
      .from('creatives')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { message: '创建创意失败', error: error.message } satisfies Partial<CreateCreativeResponse>,
        { status: 500 }
      )
    }

    const created = data as unknown as Creative

    return NextResponse.json(
      { message: '创建成功', author_id: created.author_id, slug: created.slug } satisfies CreateCreativeResponse,
      { status: 201 }
    )
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return NextResponse.json(
      { message: '服务器内部错误', error: msg },
      { status: 500 }
    )
  }
}