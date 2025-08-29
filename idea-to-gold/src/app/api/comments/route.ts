// Next.js Route Handler - 评论系统（创意 & 多层回复）
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestContext } from '@cloudflare/next-on-pages'

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

// GET /api/comments?creative_id=xxx - 获取某个创意下的全部评论（含作者公开资料），按时间升序
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now() // 性能监控：开始时间
  
  try {
    const creativeId = request.nextUrl.searchParams.get('creative_id')?.trim() || ''
    if (!creativeId) {
      return NextResponse.json(
        { message: '缺少必填查询参数：creative_id' } satisfies Partial<CommentsListResponse>,
        { status: 400 }
      )
    }

    // 分页参数
    const limitParam = request.nextUrl.searchParams.get('limit')
    const offsetParam = request.nextUrl.searchParams.get('offset')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 20 // 默认20条，最多100条
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0

    // 环境变量获取：开发环境使用 process.env，生产环境使用 getRequestContext
    let supabaseUrl: string | undefined
    let serviceRoleKey: string | undefined
    
    if (process.env.NODE_ENV === 'development') {
      // 开发环境：从 process.env 读取
      supabaseUrl = process.env.SUPABASE_URL
      serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    } else {
      // 生产环境：从 Cloudflare Pages 运行时上下文读取
      const { env } = getRequestContext()
      supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
      serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 优化认证：快速token解析，避免完整的用户查询
    const authStartTime = Date.now() // 性能监控：认证开始时间
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    let userId: string | null = null
    
    if (token) {
      try {
        // 使用轻量级的JWT解析，避免数据库查询
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.sub || null
        
        // 简单的token有效性检查（检查过期时间）
        const now = Math.floor(Date.now() / 1000)
        if (payload.exp && payload.exp < now) {
          userId = null // token已过期
        }
      } catch (error) {
        // token格式错误，忽略认证
        userId = null
      }
    }
    
    const authEndTime = Date.now() // 性能监控：认证结束时间
    const authDuration = authEndTime - authStartTime

    // 直接查询数据库（使用Next.js内置缓存机制）
    const queryStartTime = Date.now() // 性能监控：查询开始时间
    
    let enriched: CommentItem[] = []
    let likesQueryDuration = 0
    
    if (userId) {
      // 用户已登录：使用复杂查询一次性获取评论、作者信息和点赞统计
      const { data: rawData, error } = await supabase.rpc('get_comments_with_likes', {
        p_creative_id: creativeId,
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      })
      
      if (error) {
        // 如果存储过程不存在，回退到原有查询方式
        console.warn('存储过程不存在，使用原有查询方式:', error.message)
        
        // 原有的分离查询逻辑
        const { data, error: commentsError } = await supabase
          .from('comments')
          .select(
            `id, content, author_id, creative_id, project_log_id, parent_comment_id, created_at,
             profiles(nickname, avatar_url)`
          )
          .eq('creative_id', creativeId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
          
        if (commentsError) {
          return NextResponse.json(
            { message: '查询评论失败', error: commentsError.message } satisfies Partial<CommentsListResponse>,
            { status: 500 }
          )
        }
        
        const base = (data || []) as unknown as CommentItem[]
        
        if (base.length > 0) {
          const likesQueryStartTime = Date.now()
          const ids = base.map((c) => c.id)
          const { data: likeRows, error: likeErr } = await supabase
            .from('comment_likes')
            .select('comment_id, user_id')
            .in('comment_id', ids)
          likesQueryDuration = Date.now() - likesQueryStartTime
          
          if (!likeErr && likeRows) {
            const countMap = new Map<string, number>()
            const likedSet = new Set<string>()
            for (const row of likeRows as Array<{ comment_id: string; user_id: string }>) {
              countMap.set(row.comment_id, (countMap.get(row.comment_id) || 0) + 1)
              if (row.user_id === userId) likedSet.add(row.comment_id)
            }
            enriched = base.map((c) => ({
              ...c,
              likes_count: countMap.get(c.id) || 0,
              current_user_liked: likedSet.has(c.id),
            }))
          } else {
            enriched = base.map((c) => ({ ...c, likes_count: 0, current_user_liked: false }))
          }
        }
      } else {
        // 存储过程调用成功，直接使用返回的数据
        enriched = (rawData || []).map((row: any) => ({
          id: row.id,
          content: row.content,
          author_id: row.author_id,
          creative_id: row.creative_id,
          project_log_id: row.project_log_id,
          parent_comment_id: row.parent_comment_id,
          created_at: row.created_at,
          profiles: row.nickname || row.avatar_url ? {
            nickname: row.nickname,
            avatar_url: row.avatar_url
          } : null,
          likes_count: row.likes_count || 0,
          current_user_liked: row.current_user_liked || false,
        }))
      }
    } else {
      // 用户未登录：只查询评论和作者信息，不查询点赞数据
      const { data, error } = await supabase
        .from('comments')
        .select(
          `id, content, author_id, creative_id, project_log_id, parent_comment_id, created_at,
           profiles(nickname, avatar_url)`
        )
        .eq('creative_id', creativeId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
        
      if (error) {
        return NextResponse.json(
          { message: '查询评论失败', error: error.message } satisfies Partial<CommentsListResponse>,
          { status: 500 }
        )
      }
      
      enriched = (data || []).map((c: any) => ({
        ...c,
        likes_count: 0,
        current_user_liked: false,
      }))
    }
    
    const queryEndTime = Date.now() // 性能监控：查询结束时间
    const queryDuration = queryEndTime - queryStartTime

    // 移除内存缓存逻辑，依赖Next.js内置缓存

    // 优化：通过返回数据量判断是否还有更多数据，避免昂贵的count查询
    const hasMore = enriched.length === limit
    
    const endTime = Date.now() // 性能监控：总结束时间
    const totalDuration = endTime - startTime
    
    // 性能日志记录
    console.log(`[评论API性能] 总耗时: ${totalDuration}ms, 认证: ${authDuration}ms, 主查询: ${queryDuration}ms, 点赞查询: ${likesQueryDuration}ms, 评论数: ${enriched.length}`)

    const response = NextResponse.json(
      { 
        message: '获取评论成功', 
        comments: enriched,
        pagination: {
          limit,
          offset,
          hasMore
        },
        // 开发环境下返回性能数据
        ...(process.env.NODE_ENV === 'development' && {
          performance: {
            totalDuration,
            authDuration,
            queryDuration,
            likesQueryDuration,
            cached: false
          }
        })
      } satisfies CommentsListResponse,
      { status: 200 }
    )
    
    // 添加缓存控制头，让浏览器和CDN缓存30秒
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30')
    
    return response
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// POST /api/comments - 发表新评论（需要登录）
// 请求体：{ content: string, creative_id: string, parent_comment_id?: string }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 环境变量获取：开发环境使用 process.env，生产环境使用 getRequestContext
    let supabaseUrl: string | undefined
    let serviceRoleKey: string | undefined
    
    if (process.env.NODE_ENV === 'development') {
      // 开发环境：从 process.env 读取
      supabaseUrl = process.env.SUPABASE_URL
      serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    } else {
      // 生产环境：从 Cloudflare Pages 运行时上下文读取
      const { env } = getRequestContext()
      supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
      serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    }
    
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

    // 环境变量获取：开发环境使用 process.env，生产环境使用 getRequestContext
    let supabaseUrl: string | undefined
    let serviceRoleKey: string | undefined
    
    if (process.env.NODE_ENV === 'development') {
      // 开发环境：从 process.env 读取
      supabaseUrl = process.env.SUPABASE_URL
      serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    } else {
      // 生产环境：从 Cloudflare Pages 运行时上下文读取
      const { env } = getRequestContext()
      supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
      serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    }
    
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