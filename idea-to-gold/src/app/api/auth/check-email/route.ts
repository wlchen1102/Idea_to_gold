import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(()=>null) as { email?: string } | null
    const email = body?.email
    if (!email) return NextResponse.json({ message:'缺少必填字段：email' }, { status:400 })

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ message:'服务端环境变量未配置' }, { status:500 })

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: users, error } = await supabase.auth.admin.listUsers()
    if (error) return NextResponse.json({ message:'查询失败', error: error.message }, { status:500 })

    const exists = !!users?.users?.find(u => u.email === email)
    return NextResponse.json({ exists, message: exists ? '邮箱已注册' : '邮箱可用于注册' }, { status:200 })
  } catch(e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message:'服务器内部错误', error: msg }, { status:500 })
  }
}