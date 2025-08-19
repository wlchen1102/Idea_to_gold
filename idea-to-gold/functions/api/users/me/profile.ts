import { createClient } from '@supabase/supabase-js'
import type { CloudflareContext, UserProfile } from '../../../types'

// PATCH /api/users/me/profile 更新当前用户的资料
export async function onRequestPatch(context: CloudflareContext): Promise<Response> {
  try {
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ message: '服务端环境变量未配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const authHeader = context.request.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: '未授权' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    const token = authHeader.slice(7)

    const body = await context.request.json().catch(() => null) as Partial<UserProfile> | null
    if (!body) {
      return new Response(JSON.stringify({ message: '请求体解析失败' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { global: { fetch } })

    // 可选：校验 token 是否有效
    const { data: userInfo, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !userInfo?.user?.id) {
      return new Response(JSON.stringify({ message: '访问令牌无效或已过期' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

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

    if (error) {
      return new Response(JSON.stringify({ message: '更新失败', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ message: '更新成功' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return new Response(JSON.stringify({ message: '服务器内部错误', error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}