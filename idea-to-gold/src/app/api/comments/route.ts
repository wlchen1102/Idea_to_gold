// Next.js Route Handler - 评论系统（创意 & 多层回复）
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestContext } from '@cloudflare/next-on-pages'

// 统一采用 Edge Runtime（与项目一致）
export const runtime = 'edge'

// 评论记录类型定义（最小必要字段）
interface CommentItem {
  id: string
  content: string
  author_id: string
  creative_id: string | null
  project_log_id: string | null
  parent_comment_id: string | null
  created_at: string
  profiles?: {
    nickname: string | null
    avatar_url: string | null
  } | null
}

interface CommentsListResponse {
  message: string
  comments?: CommentItem[]
  error?: string
}

interface CreateCommentResponse {
  message: string
  comment?: CommentItem | null
  error?: string
}

// GET /api/comments?creative_id=xxx - 获取某个创意下的全部评论（含作者公开资料），按时间升序
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const creativeId = request.nextUrl.searchParams.get('creative_id')?.trim() || ''
    if (!creativeId) {
      return NextResponse.json(
        { message: '缺少必填查询参数：creative_id' } satisfies Partial<CommentsListResponse>,
        { status: 400 }
      )
    }

    // 从 Cloudflare Pages 运行时上下文中读取服务端环境变量
    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 进行关联查询：联表 profiles 以获取 nickname、avatar_url
    const { data, error } = await supabase
      .from('comments')
      .select(
        `id, content, author_id, creative_id, project_log_id, parent_comment_id, created_at,
         profiles(nickname, avatar_url)`
      )
      .eq('creative_id', creativeId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json(
        { message: '查询评论失败', error: error.message } satisfies Partial<CommentsListResponse>,
        { status: 500 }
      )
    }

    const comments = (data || []) as unknown as CommentItem[]
    return NextResponse.json(
      { message: '获取评论成功', comments } satisfies CommentsListResponse,
      { status: 200 }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// POST /api/comments - 发表新评论（需要登录）
// 请求体：{ content: string, creative_id: string, parent_comment_id?: string }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 读取并校验服务端环境变量
    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    // 鉴权（必须登录）
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未授权：缺少认证令牌' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: authData, error: authErr } = await supabase.auth.getUser(token)
    const userId = authData?.user?.id || ''
    if (authErr || !userId) {
      return NextResponse.json({ message: '访问令牌无效或已过期' }, { status: 401 })
    }

    // 解析请求体
    const body = (await request.json().catch(() => null)) as {
      content?: string
      creative_id?: string
      parent_comment_id?: string | null
    } | null

    const rawContent = body?.content
    const content = typeof rawContent === 'string' ? rawContent.trim() : ''
    const creativeId = body?.creative_id?.trim() || ''
    const parentId = (body?.parent_comment_id ?? null) as string | null

    if (!content || !creativeId) {
      return NextResponse.json(
        { message: '缺少必填字段：content 或 creative_id' } satisfies Partial<CreateCommentResponse>,
        { status: 400 }
      )
    }

    // 插入评论：author_id 来自已验证用户；parent_comment_id 可为 null
    const insertPayload = {
      content,
      creative_id: creativeId,
      author_id: userId,
      parent_comment_id: parentId,
    }

    const { data, error } = await supabase
      .from('comments')
      .insert(insertPayload)
      .select(
        `id, content, author_id, creative_id, project_log_id, parent_comment_id, created_at,
         profiles(nickname, avatar_url)`
      )
      .single()

    if (error) {
      return NextResponse.json(
        { message: '发表评论失败', error: error.message } satisfies Partial<CreateCommentResponse>,
        { status: 500 }
      )
    }

    const created = (data || null) as unknown as CommentItem | null
    return NextResponse.json(
      { message: '发表成功', comment: created } satisfies CreateCommentResponse,
      { status: 201 }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// DELETE /api/comments?id=xxx - 删除单条评论（仅作者可删）
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim() || ''
    if (!id) {
      return NextResponse.json({ message: '缺少必填参数：id' }, { status: 400 })
    }

    // 读取服务端环境变量
    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    // 鉴权：需要 Bearer Token
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未授权：缺少认证令牌' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 验证 token，获取 userId
    const { data: authData, error: authErr } = await supabase.auth.getUser(token)
    const userId = authData?.user?.id || ''
    if (authErr || !userId) {
      return NextResponse.json({ message: '访问令牌无效或已过期' }, { status: 401 })
    }

    // 确认评论存在并且属于当前用户
    const { data: row, error: qErr } = await supabase
      .from('comments')
      .select('id, author_id')
      .eq('id', id)
      .maybeSingle()

    if (qErr) {
      return NextResponse.json({ message: '查询评论失败', error: qErr.message }, { status: 500 })
    }

    if (!row) {
      return NextResponse.json({ message: '评论不存在或已被删除' }, { status: 404 })
    }

    if ((row as { author_id: string }).author_id !== userId) {
      return NextResponse.json({ message: '无权限删除他人评论' }, { status: 403 })
    }

    // 允许删除，即使存在子回复（交由数据库外键策略决定级联或拒绝）
    const { error: delErr } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (delErr) {
      const msg = (delErr as unknown as { message?: string }).message || ''
      return NextResponse.json({ message: '删除失败', error: msg || 'unknown' }, { status: 500 })
    }

    return NextResponse.json({ message: '删除成功' }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}