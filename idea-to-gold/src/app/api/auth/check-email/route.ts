import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminEnvVars } from '@/lib/env'

export const runtime = 'edge'

// 检查邮箱是否已注册
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string } | null
    const email = body?.email?.trim()
    if (!email) {
      return NextResponse.json({ message: '缺少必填字段：email' }, { status: 400 })
    }

    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getAdminEnvVars()

    // 使用服务角色密钥创建 Supabase 管理客户端
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 通过 auth schema 的 users 表判断邮箱是否存在（service_role 有权限）
    const { data, error } = await supabase
      .schema('auth')
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ message: '查询失败', error: error.message }, { status: 500 })
    }

    const exists = !!data?.id
    return NextResponse.json(
      { exists, message: exists ? '邮箱已注册' : '邮箱可用于注册' },
      { status: 200 }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}