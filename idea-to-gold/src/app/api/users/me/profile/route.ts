import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/types'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// 仅用于性能优化：直接从 JWT 解析 userId（sub 字段），避免额外的 auth.getUser 网络请求
// 注意：这里不做签名校验，只用于读取 userId。在需要强校验的接口仍应调用 auth.getUser。
function parseJwtSub(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    // base64url -> base64
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    // padding
    const pad = payload.length % 4
    if (pad) payload += '='.repeat(4 - pad)
    const json = atob(payload)
    const obj = JSON.parse(json) as { sub?: string }
    return typeof obj.sub === 'string' ? obj.sub : null
  } catch {
    return null
  }
}

// GET /api/users/me/profile - 读取当前登录用户的资料（更小字段集）
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const authHeader = request.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '未授权' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 并行优化：先尝试从 JWT 里解析出 userId，若成功则提前发起 profile 查询
    const parsedUid = parseJwtSub(token)
    const profilePromise = parsedUid
      ? supabase
          .from('profiles')
          .select('id,nickname,avatar_url,bio')
          .eq('id', parsedUid)
          .maybeSingle()
      : null

    // 与鉴权并行
    const authPromise = supabase.auth.getUser(token)

    // 等待鉴权结果（安全兜底）
    const { data: userInfo, error: authErr } = await authPromise
    if (authErr || !userInfo?.user?.id) {
      return NextResponse.json({ message: '访问令牌无效或已过期' }, { status: 401 })
    }

    // 若已提前查询，则直接拿结果；否则使用鉴权返回的 id 再查一次
    const { data, error } = profilePromise
      ? await profilePromise
      : await supabase
          .from('profiles')
          .select('id,nickname,avatar_url,bio')
          .eq('id', userInfo.user.id)
          .maybeSingle()

    if (error) {
      return NextResponse.json({ message: '查询失败', error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'ok', profile: data ?? null }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ message:'服务端环境变量未配置' }, { status:500 })

    const authHeader = request.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ message:'未授权' }, { status:401 })
    const token = authHeader.slice(7)

    const body = await request.json().catch(()=>null) as Partial<UserProfile> | null
    if (!body) return NextResponse.json({ message:'请求体解析失败' }, { status:400 })

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: userInfo, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !userInfo?.user?.id) return NextResponse.json({ message:'访问令牌无效或已过期' }, { status:401 })

    type ProfilePatch = { nickname?: string; avatar_url?: string; bio?: string }
    const safeBody = body as unknown as ProfilePatch

    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: safeBody.nickname ?? undefined,
        avatar_url: safeBody.avatar_url ?? undefined,
        bio: safeBody.bio ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userInfo.user.id)

    if (error) return NextResponse.json({ message:'更新失败', error: error.message }, { status:500 })

    return NextResponse.json({ message:'更新成功' }, { status:200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message:'服务器内部错误', error: msg }, { status:500 })
  }
}