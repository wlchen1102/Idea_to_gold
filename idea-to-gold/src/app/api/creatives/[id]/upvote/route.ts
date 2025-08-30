import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

export const runtime = 'edge'

interface AddUpvoteResult {
  new_upvote_count: number
  was_inserted: boolean
}

interface RemoveUpvoteResult {
  new_upvote_count: number
  was_deleted: boolean
}

// GET /api/creatives/:id/upvote -> 读取点赞情况（总数 + 当前用户是否已点赞）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const awaitedParams = await params
    const creativeId = awaitedParams?.id
    if (!creativeId) return NextResponse.json({ message: '缺少参数：id' }, { status: 400 })

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // token 可选：用于判断当前用户是否已点赞
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    let userId: string | null = null
    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token)
      userId = userData?.user?.id ?? null
    }

    // 1) 统计总数：优先从关联表计数，若表不存在则回退到 creatives.upvote_count
    let total = 0
    let upvoteTableMissing = false
    const { count, error: countError } = await supabaseAdmin
      .from('creative_upvotes')
      .select('*', { count: 'exact', head: true })
      .eq('creative_id', creativeId)

    if (countError) {
      const code = (countError as { code?: string; message?: string } | null)?.code || ''
      const msg = (countError as { message?: string } | null)?.message?.toLowerCase?.() || ''
      upvoteTableMissing = code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))
      console.warn('[UPVOTE_GET_COUNT_ERROR]', { code, msg })
    }
    if (typeof count === 'number' && count >= 0) total = count

    if ((countError && !upvoteTableMissing) || total === 0) {
      // 有错误但不是表缺失，或者表计数为0；尝试读取 creatives.upvote_count（若存在）
      const { data: cRow, error: cErr } = await supabaseAdmin
        .from('creatives')
        .select('upvote_count')
        .eq('id', creativeId)
        .maybeSingle()
      if (!cErr && cRow && typeof (cRow as Record<string, unknown>).upvote_count === 'number') {
        total = Number((cRow as Record<string, number>).upvote_count || 0)
      }
    }

    // 2) 判断当前用户是否已点赞（若拿到 userId 且表存在）
    let supported = false
    if (userId && !upvoteTableMissing) {
      const { data: existRow, error: existErr } = await supabaseAdmin
        .from('creative_upvotes')
        .select('user_id')
        .eq('creative_id', creativeId)
        .eq('user_id', userId)
        .maybeSingle()
      supported = !!existRow && !existErr
    }

    return NextResponse.json({ message: 'ok', upvote_count: Number(total || 0), supported }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    console.error('[UPVOTE_GET_FATAL]', msg)
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// POST /api/creatives/:id/upvote -> 点赞
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 })

    const awaitedParams = await params
    const creativeId = awaitedParams?.id
    if (!creativeId) return NextResponse.json({ message: '缺少参数：id' }, { status: 400 })

    // 使用 service_role 客户端校验 token
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)
    const userId = userData?.user?.id
    if (authError || !userId) {
      return NextResponse.json({ message: '认证令牌无效，请重新登录' }, { status: 401 })
    }

    // 直接以 service_role 执行 RPC，并显式传入 p_user_id，避免依赖 auth.uid()
    const { data, error } = await (supabaseAdmin.rpc('add_upvote', {
      p_creative_id: creativeId,
      p_user_id: userId,
    }) as unknown as Promise<{ data: AddUpvoteResult | null; error: { message: string; code?: string; details?: string; hint?: string } | null }>)

    if (error) {
      console.error('[UPVOTE_POST_ERROR]', {
        creativeId,
        userId,
        code: (error as { code?: string }).code,
        message: error.message,
        details: (error as { details?: string }).details,
        hint: (error as { hint?: string }).hint,
      })

      const code = (error as { code?: string }).code || ''
      const msg = (error.message || '').toLowerCase()
      const maybeMissingFn = code === '42883' || msg.includes('function add_upvote') || msg.includes('add_upvote')
      if (maybeMissingFn) {
        return NextResponse.json(
          { message: '数据库缺少或签名不匹配的 RPC: add_upvote(uuid, uuid)，请确认已创建双参数版本', code, error: error.message },
          { status: 500 }
        )
      }
      return NextResponse.json({ message: '点赞失败', code, error: error.message }, { status: 500 })
    }

    const payload = {
      upvote_count: Number((data as AddUpvoteResult | null)?.new_upvote_count ?? 0),
      changed: Boolean((data as AddUpvoteResult | null)?.was_inserted ?? false),
    }

    return NextResponse.json({ message: 'ok', ...payload }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    console.error('[UPVOTE_POST_FATAL]', msg)
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// DELETE /api/creatives/:id/upvote -> 取消点赞
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 })

    const awaitedParams = await params
    const creativeId = awaitedParams?.id
    if (!creativeId) return NextResponse.json({ message: '缺少参数：id' }, { status: 400 })

    // 使用 service_role 客户端校验 token
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)
    const userId = userData?.user?.id
    if (authError || !userId) {
      return NextResponse.json({ message: '认证令牌无效，请重新登录' }, { status: 401 })
    }

    // 直接以 service_role 执行 RPC，并显式传入 p_user_id
    const { data, error } = await (supabaseAdmin.rpc('remove_upvote', {
      p_creative_id: creativeId,
      p_user_id: userId,
    }) as unknown as Promise<{ data: RemoveUpvoteResult | null; error: { message: string; code?: string; details?: string; hint?: string } | null }>)

    if (error) {
      console.error('[UPVOTE_DELETE_ERROR]', {
        creativeId,
        userId,
        code: (error as { code?: string }).code,
        message: error.message,
        details: (error as { details?: string }).details,
        hint: (error as { hint?: string }).hint,
      })
      const code = (error as { code?: string }).code || ''
      const msg = (error.message || '').toLowerCase()
      const maybeMissingFn = code === '42883' || msg.includes('function remove_upvote') || msg.includes('remove_upvote')
      if (maybeMissingFn) {
        return NextResponse.json(
          { message: '数据库缺少或签名不匹配的 RPC: remove_upvote(uuid, uuid)，请确认已创建双参数版本', code, error: error.message },
          { status: 500 }
        )
      }
      return NextResponse.json({ message: '取消点赞失败', code, error: error.message }, { status: 500 })
    }

    const payload = {
      upvote_count: Number((data as RemoveUpvoteResult | null)?.new_upvote_count ?? 0),
      changed: Boolean((data as RemoveUpvoteResult | null)?.was_deleted ?? false),
    }

    return NextResponse.json({ message: 'ok', ...payload }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    console.error('[UPVOTE_DELETE_FATAL]', msg)
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}