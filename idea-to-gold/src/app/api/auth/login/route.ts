import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { AuthResponse } from '@/lib/types'

export const runtime = 'edge'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null) as { phone?: string; email?: string; password?: string } | null
    const phone = body?.phone
    const email = body?.email
    const password = body?.password

    if ((!phone && !email) || !password) {
      return NextResponse.json({ message: '缺少必填字段：email/phone 和 password' }, { status: 400 })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置：SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const signInResult = phone
      ? await supabase.auth.signInWithPassword({ phone, password: password as string })
      : await supabase.auth.signInWithPassword({ email: email as string, password: password as string })
    const { data, error } = signInResult

    if (error) return NextResponse.json({ message: '登录失败', error: error.message }, { status: 401 })

    const resp: AuthResponse = {
      message: '登录成功',
      userId: data.user?.id ?? null,
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at ?? undefined,
      } : null,
    }
    return NextResponse.json(resp, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}