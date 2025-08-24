import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

interface LikePayload { likes_count: number; liked: boolean }

// POST /api/comments/:id/like -> 点赞
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

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

    // 插入点赞，若已存在则忽略（幂等）
    const { error: insErr } = await supabaseAdmin
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId })

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
    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

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