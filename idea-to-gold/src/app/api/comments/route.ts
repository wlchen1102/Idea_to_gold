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
// - 使用优化的存储过程避免N+1查询问题，提升性能
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
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 20
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0

    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 获取当前用户ID（如果有认证token）
    let userId: string | null = null
    if (includeLikes) {
      const authHeader = request.headers.get('Authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const { data: authData, error: authErr } = await supabase.auth.getUser(token)
        if (!authErr && authData?.user?.id) {
          userId = authData.user.id
        }
      }
    }

    // 使用优化的存储过程进行查询
    const { data, error } = await supabase.rpc('get_comments_with_likes', {
      p_creative_id: creativeId,
      p_project_id: projectId,
      p_project_log_id: projectLogId,
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset
    })

    if (error) {
      return NextResponse.json(
        { message: '查询评论失败', error: error.message } satisfies Partial<CommentsListResponse>,
        { status: 500 }
      )
    }

    // 转换存储过程结果为期望的格式
    const comments: CommentItem[] = (data || []).map((row: any) => {
      const comment: CommentItem = {
        id: row.id,
        content: row.content,
        author_id: row.author_id,
        creative_id: row.creative_id,
        project_id: row.project_id,
        project_log_id: row.project_log_id,
        parent_comment_id: row.parent_comment_id,
        created_at: row.created_at,
        profiles: {
          nickname: row.nickname || null,
          avatar_url: row.avatar_url || null
        }
      }

      // 如果包含点赞统计，添加相关字段
      if (includeLikes) {
        comment.likes_count = Number(row.likes_count) || 0
        comment.current_user_liked = Boolean(row.current_user_liked)
      }

      return comment
    })

    // 统计总数：用于前端显示“全部评论数”与是否还有更多
    let countBuilder = supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })

    if (creativeId) {
      countBuilder = countBuilder.eq('creative_id', creativeId)
    } else if (projectId && projectLogId) {
      countBuilder = countBuilder.eq('project_id', projectId).eq('project_log_id', projectLogId)
    } else if (projectId) {
      // 仅项目层级评论（不含日志）
      // 使用 is(null) 区分
      countBuilder = countBuilder.eq('project_id', projectId).is('project_log_id', null)
    }

    const { count: totalCount, error: countErr } = await countBuilder
    if (countErr) {
      return NextResponse.json(
        { message: '查询评论总数失败', error: countErr.message } satisfies Partial<CommentsListResponse>,
        { status: 500 }
      )
    }

    const total = totalCount ?? 0
    const hasMore = offset + comments.length < total

    const response = NextResponse.json(
      { message: '获取评论成功', comments, pagination: { limit, offset, total, hasMore } } satisfies Partial<CommentsListResponse>,
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