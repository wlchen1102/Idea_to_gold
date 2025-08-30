import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminEnvVars } from '@/lib/env'

export const runtime = 'edge'

const normalize = (raw: string) => {
  const s=(raw||'').trim(); if(!s) return ''
  const digits=s.replace(/[^\d]/g,'')
  if (digits.startsWith('86') && digits.length===13) return digits
  if (/^1[3-9]\d{9}$/.test(digits)) return '86'+digits
  return digits
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(()=>null) as { phone?: string } | null
    const phone = body?.phone
    if (!phone) return NextResponse.json({ message:'缺少必填字段：phone' }, { status:400 })

    const { supabaseUrl, serviceRoleKey } = getAdminEnvVars()

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: users, error } = await supabase.auth.admin.listUsers()
    if (error) return NextResponse.json({ message:'查询失败', error: error.message }, { status:500 })

    const norm = normalize(phone)
    const exists = !!users?.users?.find(u => normalize(u.phone || '') === norm)
    return NextResponse.json({ exists, message: exists ? '手机号已注册，请直接登录' : '手机号未注册，请先注册' }, { status:200 })
  } catch(e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message:'服务器内部错误', error: msg }, { status:500 })
  }
}