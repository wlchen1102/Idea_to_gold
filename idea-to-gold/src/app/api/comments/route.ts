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

// 归一化后的用户信息（用于避免 Supabase 关联选择在 TS 中被推断为数组的情况）
type ProfileCompact = { nickname: string | null; avatar_url: string | null }

// 类型守卫：判断未知值是否为 ProfileCompact 对象
function isProfileCompact(value: unknown): value is ProfileCompact {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return 'nickname' in obj && 'avatar_url' in obj
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

// 存储过程返回的行类型（用于类型安全）
interface RpcCommentRow {
  id: string
  content: string
  author_id: string
  creative_id: string | null
  project_id: string | null
  project_log_id: string | null
  parent_comment_id: string | null
  created_at: string
  nickname?: string | null
  avatar_url?: string | null
  // likes_count 可能为 number 或字符串（取决于数据库聚合返回类型），也可能为 null
  likes_count?: number | string | null
  current_user_liked?: boolean | null
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

    // 获取环境变量与 Supabase 客户端
    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 当前用户ID（用于计算是否点赞）
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const { data: userData, error: authError } = await supabase.auth.getUser(token)
        if (!authError && userData?.user?.id) {
          userId = userData.user.id
        }
      } catch (_e) {
        // 忽略认证错误，仍可获取公共评论
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
    const comments: CommentItem[] = (data || []).map((row: RpcCommentRow) => {
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
        comment.likes_count = Number(row.likes_count ?? 0)
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

    const { count } = await countBuilder
    const hasMore = typeof count === 'number' ? offset + comments.length < count : false

    return NextResponse.json(
      {
        message: '查询成功',
        comments,
        pagination: { limit, offset, total: count ?? undefined, hasMore }
      } satisfies CommentsListResponse,
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    return NextResponse.json(
      { message: '服务器内部错误', error: (e as Error).message } satisfies Partial<CommentsListResponse>,
      { status: 500 }
    )
  }
}

// 发表评论
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    const targetIds = [body.creative_id, body.project_id, body.project_log_id].filter(Boolean)
    if (targetIds.length !== 1) {
      return NextResponse.json(
        { message: '参数错误：三种目标ID中必须且只能出现一个', error: '参数错误' } satisfies Partial<CreateCommentResponse>,
        { status: 400 }
      )
    }

    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json(
        { message: '评论内容不能为空', error: '内容为空' } satisfies Partial<CreateCommentResponse>,
        { status: 400 }
      )
    }

    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 鉴权：必须登录
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '未登录或令牌无效', error: '未登录' } satisfies Partial<CreateCommentResponse>,
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user?.id) {
      return NextResponse.json(
        { message: '无效的认证信息', error: authError?.message ?? '无效认证' } satisfies Partial<CreateCommentResponse>,
        { status: 401 }
      )
    }

    const userId = userData.user.id

    // 构造插入行，严格区分三种目标（满足数据库CHECK约束）
    const insertRow: {
      content: string
      author_id: string
      creative_id: string | null
      project_id: string | null
      project_log_id: string | null
    } = {
      content: body.content.trim(),
      author_id: userId,
      creative_id: null,
      project_id: null,
      project_log_id: null
    }

    if (body.creative_id) {
      insertRow.creative_id = String(body.creative_id)
    } else if (body.project_id && body.project_log_id) {
      insertRow.project_id = String(body.project_id)
      insertRow.project_log_id = String(body.project_log_id)
    } else if (body.project_id) {
      insertRow.project_id = String(body.project_id)
    }

    const { data: inserted, error: insertError } = await supabase
      .from('comments')
      .insert(insertRow)
      .select(
        `id, content, author_id, creative_id, project_id, project_log_id, parent_comment_id, created_at,
         profiles:profiles!comments_author_id_fkey ( nickname, avatar_url )`
      )
      .single()

    if (insertError) {
      return NextResponse.json(
        { message: '发表评论失败', error: insertError.message } satisfies Partial<CreateCommentResponse>,
        { status: 500 }
      )
    }

    // 归一化 Supabase 关联返回的 profiles（可能是对象或数组）
    let normalizedProfile: ProfileCompact | null = null
    const pUnknown: unknown = (inserted as { profiles?: unknown } | null)?.profiles ?? null
    if (Array.isArray(pUnknown)) {
      const first = pUnknown[0]
      if (isProfileCompact(first)) {
        normalizedProfile = {
          nickname: first.nickname ?? null,
          avatar_url: first.avatar_url ?? null
        }
      }
    } else if (isProfileCompact(pUnknown)) {
      normalizedProfile = {
        nickname: pUnknown.nickname ?? null,
        avatar_url: pUnknown.avatar_url ?? null
      }
    }

    const newComment: CommentItem = {
      id: inserted.id,
      content: inserted.content,
      author_id: inserted.author_id,
      creative_id: inserted.creative_id,
      project_id: inserted.project_id,
      project_log_id: inserted.project_log_id,
      parent_comment_id: inserted.parent_comment_id,
      created_at: inserted.created_at,
      profiles: normalizedProfile
    }

    return NextResponse.json(
      { message: '发表成功', comment: newComment } satisfies CreateCommentResponse,
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json(
      { message: '服务器内部错误', error: (e as Error).message } satisfies Partial<CreateCommentResponse>,
      { status: 500 }
    )
  }
}

// 删除评论（仅作者本人）
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const search = request.nextUrl.searchParams
    const commentId = search.get('id')?.trim()
    if (!commentId) {
      return NextResponse.json({ message: '缺少评论ID' }, { status: 400 })
    }

    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '未登录或令牌无效' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ message: '无效的认证信息' }, { status: 401 })
    }

    const userId = userData.user.id

    // 确认评论存在且为当前用户所写
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, author_id')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ message: '评论不存在' }, { status: 404 })
    }

    if (comment.author_id !== userId) {
      return NextResponse.json({ message: '只有作者可以删除自己的评论' }, { status: 403 })
    }

    const { error: delError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (delError) {
      return NextResponse.json({ message: '删除失败', error: delError.message }, { status: 500 })
    }

    return NextResponse.json({ message: '删除成功' }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ message: '服务器内部错误', error: (e as Error).message }, { status: 500 })
  }
}