// Next.js Route Handler - 评论系统（创意 & 多层回复 & 项目/日志）
// 功能与作用：
// - 提供统一的评论接口，支持三种评论目标：创意、产品(项目)、开发日志
// - GET：根据 creative_id / project_id / project_log_id 动态获取评论列表
// - POST：根据请求体中的目标ID智能构造插入数据，确保与数据库CHECK约束一致
// - DELETE：仅作者可删除自己的评论
// - 运行于 Edge Runtime，兼容 Cloudflare Pages

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

// 统一采用 Edge Runtime（与项目一致）
export const runtime = 'edge'

// 使用Next.js内置缓存替代内存缓存
// 在Edge Runtime环境下，内存缓存无法在Worker实例间共享
// 改用基于响应头的缓存策略

// 评论记录类型定义（最小必要字段）
interface CommentItem {
  id: string
  content: string
  author_id: string
  creative_id: string | null
  project_id: string | null // 新增：项目ID，支持“产品评论”和“日志评论”
  project_log_id: string | null
  parent_comment_id: string | null
  created_at: string
  profiles?: {
    nickname: string | null
    avatar_url: string | null
  } | null
  // 新增：点赞聚合结果（可选）
  likes_count?: number
  current_user_liked?: boolean
}

interface CommentsListResponse {
  message: string
  comments?: CommentItem[]
  pagination?: {
    limit: number
    offset: number
    total?: number
    hasMore?: boolean
  }
  error?: string
}

interface CreateCommentResponse {
  message: string
  comment?: CommentItem | null
  error?: string
}

// GET /api/comments?creative_id=xxx | ?project_id=xxx[&project_log_id=yyy]
// - 支持三种目标：创意、产品(项目)、开发日志
// - 当仅提供 project_id 时，默认只返回“产品评论”（即 project_log_id IS NULL）
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const search = request.nextUrl.searchParams
    const creativeId = search.get('creative_id')?.trim() || null
    const projectId = search.get('project_id')?.trim() || null
    const projectLogId = search.get('project_log_id')?.trim() || null
    // 是否包含点赞统计
    const includeLikesParam = search.get('include_likes')
    const includeLikes = includeLikesParam === '1' || includeLikesParam === 'true'

    if (!creativeId && !projectId && !projectLogId) {
      return NextResponse.json(
        { message: '缺少查询参数：请提供 creative_id 或 project_id 或 project_log_id' },
        { status: 400 }
      )
    }

    // 可选分页参数（与旧实现兼容）
    const limitParam = search.get('limit')
    const offsetParam = search.get('offset')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : null
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0

    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 构建动态查询
    let query = supabase
      .from('comments')
      .select(
        `id, content, author_id, creative_id, project_id, project_log_id, parent_comment_id, created_at,
         profiles(nickname, avatar_url)`
      )

    if (creativeId) {
      query = query.eq('creative_id', creativeId)
    }

    if (projectId && projectLogId) {
      // 日志评论：同时匹配 project_id + project_log_id
      query = query.eq('project_id', projectId).eq('project_log_id', projectLogId)
    } else if (projectId) {
      // 产品(项目)评论：仅匹配 project_id，并限定 project_log_id 为空
      query = query.eq('project_id', projectId).is('project_log_id', null)
    } else if (projectLogId) {
      // 仅提供了 project_log_id 的情况（宽松支持）
      query = query.eq('project_log_id', projectLogId)
    }

    // 排序与分页
    query = query.order('created_at', { ascending: true })
    if (limit !== null) {
      const to = offset + (limit || 0) - 1
      query = query.range(offset, Math.max(offset, to))
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { message: '查询评论失败', error: error.message } satisfies Partial<CommentsListResponse>,
        { status: 500 }
      )
    }

    const comments = (data || []) as unknown as CommentItem[]

    // 可选的点赞统计逻辑（方案A：仅在 include_likes=1 时计算）
    let resultComments: CommentItem[] = comments
    if (includeLikes && comments.length > 0) {
      const commentIds = comments.map((c) => c.id)

      // 统计每条评论的点赞数量
      const { data: likeRows, error: likesErr } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds)

      if (likesErr) {
        return NextResponse.json(
          { message: '查询点赞数据失败', error: likesErr.message },
          { status: 500 }
        )
      }

      const likeCountMap = new Map<string, number>()
      for (const row of (likeRows || []) as Array<{ comment_id: string }>) {
        likeCountMap.set(row.comment_id, (likeCountMap.get(row.comment_id) || 0) + 1)
      }

      // 当前用户是否点赞（若带有Authorization），失败则优雅降级为不返回 current_user_liked
      let likedSet: Set<string> | null = null
      const authHeader = request.headers.get('Authorization') || ''
      const hasBearer = authHeader.startsWith('Bearer ')
      if (hasBearer) {
        const token = authHeader.slice(7)
        const { data: authData, error: authErr } = await supabase.auth.getUser(token)
        const userId = authData?.user?.id || null
        if (!authErr && userId) {
          const { data: myLikeRows, error: myLikesErr } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', userId)
            .in('comment_id', commentIds)

          if (!myLikesErr) {
            likedSet = new Set<string>((myLikeRows || []).map((r: { comment_id: string }) => r.comment_id))
          }
        }
      }

      resultComments = comments.map((c) => ({
        ...c,
        likes_count: likeCountMap.get(c.id) ?? 0,
        ...(likedSet ? { current_user_liked: likedSet.has(c.id) } : {}),
      }))
    }

    const response = NextResponse.json(
      { message: '获取评论成功', comments: resultComments } satisfies Partial<CommentsListResponse>,
      { status: 200 }
    )

    // 添加缓存控制头，让浏览器和CDN缓存30秒
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30')
    // 当包含个性化字段时，避免缓存污染
    if (includeLikes) {
      response.headers.set('Vary', 'Authorization')
    }

    return response
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// POST /api/comments - 发表新评论（需要登录）
// 请求体：{ content: string, creative_id?: string, project_id?: string, project_log_id?: string, parent_comment_id?: string }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 })
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
      project_id?: string
      project_log_id?: string
      parent_comment_id?: string | null
    } | null

    const rawContent = body?.content
    const content = typeof rawContent === 'string' ? rawContent.trim() : ''
    const creativeId = body?.creative_id?.trim() || null
    const projectId = body?.project_id?.trim() || null
    const projectLogId = body?.project_log_id?.trim() || null
    const parentId = (body?.parent_comment_id ?? null) as string | null

    if (!content) {
      return NextResponse.json(
        { message: '缺少必填字段：content' } satisfies Partial<CreateCommentResponse>,
        { status: 400 }
      )
    }

    // 构造插入对象：满足数据库三种互斥组合
    const insertPayload: Record<string, unknown> = {
      content,
      author_id: userId,
    }

    if (creativeId) {
      // 创意评论
      insertPayload.creative_id = creativeId
    } else if (projectId && projectLogId) {
      // 开发日志评论
      insertPayload.project_id = projectId
      insertPayload.project_log_id = projectLogId
    } else if (projectId) {
      // 产品(项目)评论
      insertPayload.project_id = projectId
    } else {
      return NextResponse.json(
        { message: '缺少评论目标ID：请提供 creative_id 或 project_id[/project_log_id]' } satisfies Partial<CreateCommentResponse>,
        { status: 400 }
      )
    }

    if (parentId) {
      insertPayload.parent_comment_id = parentId
    }

    const { data, error } = await supabase
      .from('comments')
      .insert(insertPayload)
      .select(
        `id, content, author_id, creative_id, project_id, project_log_id, parent_comment_id, created_at,
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

    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 })
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