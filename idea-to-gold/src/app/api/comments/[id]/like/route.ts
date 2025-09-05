// Next.js Route Handler - 评论点赞接口：点赞与取消点赞
// 功能与作用：
// - 提供对单条评论的点赞与取消点赞能力
// - 本次改动：在点赞时，将评论内容快照写入 comment_likes.comment_content 字段（无触发器）

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminEnvVars } from '@/lib/env'

export const runtime = 'edge'

interface LikePayload { likes_count: number; liked: boolean }

// POST /api/comments/:id/like -> 点赞
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getAdminEnvVars()

    const awaited = await params
    const commentId = awaited?.id
    if (!commentId) return NextResponse.json({ message: '缺少参数：id' }, { status: 400 })

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 校验 token 获取 userId（必须登录）
    const { data: authData } = await supabaseAdmin.auth.getUser(token)
    const userId = authData?.user?.id || ''
    if (!userId) return NextResponse.json({ message: '未授权或登录过期' }, { status: 401 })

    // 先获取评论内容，失败不阻塞点赞但不写入内容
    let commentContent: string | null = null
    try {
      const { data: commentRow, error: commentErr } = await supabaseAdmin
        .from('comments')
        .select('content')
        .eq('id', commentId)
        .maybeSingle()

      if (!commentErr && commentRow) {
        commentContent = (commentRow as { content?: string | null }).content ?? null
      }
    } catch (_e) {
      // 忽略评论内容获取错误，继续点赞流程
      commentContent = null
    }

    // 插入点赞，若已存在则忽略（幂等）；在开发环境把评论内容快照写入 comment_content 字段
    const { error: insErr } = await supabaseAdmin
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId, ...(commentContent !== null ? { comment_content: commentContent } : {}) })

    if (insErr) {
      const code = (insErr as { code?: string } | null)?.code || ''
      // 23505 唯一键冲突，说明已点赞 -> 视为幂等成功
      if (code && code !== '23505') {
        return NextResponse.json({ message: '点赞失败', error: (insErr as { message?: string } | null)?.message || '' }, { status: 500 })
      }
    }

    // 统计最新点赞数
    const { count } = await supabaseAdmin
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    const payload: LikePayload = { likes_count: Number(count || 0), liked: true }
    return NextResponse.json({ message: 'ok', ...payload }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// DELETE /api/comments/:id/like -> 取消点赞
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getAdminEnvVars()

    const awaited = await params
    const commentId = awaited?.id
    if (!commentId) return NextResponse.json({ message: '缺少参数：id' }, { status: 400 })

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 校验 token 获取 userId（必须登录）
    const { data: authData } = await supabaseAdmin.auth.getUser(token)
    const userId = authData?.user?.id || ''
    if (!userId) return NextResponse.json({ message: '未授权或登录过期' }, { status: 401 })

    // 删除点赞，若不存在则视为幂等成功
    await supabaseAdmin
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId)

    // 统计最新点赞数
    const { count } = await supabaseAdmin
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)

    const payload: LikePayload = { likes_count: Number(count || 0), liked: false }
    return NextResponse.json({ message: 'ok', ...payload }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}