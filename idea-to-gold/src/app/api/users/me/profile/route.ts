import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/types'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

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