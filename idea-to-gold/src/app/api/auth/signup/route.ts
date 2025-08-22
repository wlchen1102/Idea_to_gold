import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const COLORS = ['#2ECC71','#3498DB','#E74C3C','#F1C40F','#9B59B6','#1ABC9C']
const pickColor = () => COLORS[Math.floor(Math.random()*COLORS.length)]
const textFrom = (s?: string|null) => {
  const v=(s||'').trim(); if(!v) return 'U'
  const cn=Array.from(v).filter(ch=>/[\u4e00-\u9fa5]/.test(ch)); if(cn.length) return (cn.slice(-2).join(''))||cn[cn.length-1]||'用'
  const letters=v.replace(/[^a-zA-Z]/g,'').toUpperCase(); if(letters) return letters.slice(0,2)
  const digits=v.replace(/\D/g,''); if(digits) return digits.slice(-2)
  return 'U'
}
const avatarUrl = (name:string,bg:string)=>`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg.replace('#','').toUpperCase()}&color=fff&size=128&bold=true`
const isE164 = (p:string)=>/^\+\d{7,15}$/.test(p)
const friendly = (raw:string, ch:'phone'|'email')=>{
  const t=raw.toLowerCase()
  if(t.includes('already registered')||t.includes('duplicate key value')||t.includes('users_phone_key')||t.includes('users_email_key')||t.includes('user already exists')) return {status:409,msg: ch==='phone'?'该手机号已注册，请直接登录或找回密码':'该邮箱已注册，请直接登录或找回密码'}
  if(t.includes('password')&&t.includes('at least')) return {status:400,msg:'密码至少6位，请重新设置'}
  if(t.includes('invalid email')) return {status:400,msg:'邮箱格式不正确'}
  return {status:400,msg:'注册失败，请稍后重试'}
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(()=>null) as { email?: string; phone?: string; password?: string; nickname?: string } | null
    const email = body?.email?.trim()
    const phone = body?.phone?.trim()
    const password = body?.password?.trim()

    if ((!email && !phone) || !password) {
      return NextResponse.json({ message:'缺少必填字段：email/phone 与 password' }, { status:400 })
    }

    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    if(!supabaseUrl || !serviceRoleKey) return NextResponse.json({ message:'服务端环境变量未配置：SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY' },{ status:500 })

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    if (phone) {
      if (!isE164(phone)) return NextResponse.json({ message:'手机号格式无效，请输入 E.164（如 +8613xxxxxxxxx）'},{ status:400 })

      const userMeta: Record<string,unknown> = {}
      if (body?.nickname?.trim()) userMeta.nickname = body.nickname.trim()

      const { data, error } = await supabase.auth.admin.createUser({ phone, password, phone_confirm:true, user_metadata:userMeta })
      if (error) {
        const f=friendly(error.message,'phone');
        console.error('手机号注册失败', { err:error.message })
        return NextResponse.json({ message:f.msg, error:error.message }, { status:f.status })
      }

      try {
        const userId = data.user?.id
        if (userId) {
          const nameSrc = body?.nickname?.trim() || String(phone)
          const url = avatarUrl(textFrom(nameSrc), pickColor())
          const updates: Record<string,unknown> = { avatar_url: url }
          if (body?.nickname?.trim()) updates.nickname = body.nickname.trim()
          await supabase.from('profiles').upsert([{ id:userId, ...updates }], { onConflict: 'id' })
        }
      } catch(e){ console.warn('生成/更新默认头像失败(手机号)', e) }

      return NextResponse.json({ message:'注册成功', userId: data.user?.id ?? null }, { status:201 })
    }

    const { data, error } = await supabase.auth.signUp({
      email: email as string,
      password: password as string,
      options: { data: body?.nickname?.trim() ? { nickname: body.nickname.trim() } : undefined }
    })
    if (error) {
      const f=friendly(error.message,'email');
      console.error('邮箱注册失败', { err:error.message })
      return NextResponse.json({ message:f.msg, error:error.message }, { status:f.status })
    }

    try {
      const userId = data.user?.id
      if (userId) {
        const nameSrc = body?.nickname?.trim() || String(email||'').split('@')[0]
        const url = avatarUrl(textFrom(nameSrc), pickColor())
        const updates: Record<string,unknown> = { avatar_url: url }
        if (body?.nickname?.trim()) updates.nickname = body.nickname.trim()
        await supabase.from('profiles').upsert([{ id:userId, ...updates }], { onConflict: 'id' })
      }
    } catch(e){ console.warn('生成/更新默认头像失败(邮箱)', e) }

    return NextResponse.json({ message:'注册成功', userId: data.user?.id ?? null }, { status:201 })
  } catch(e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message:'服务器内部错误', error: msg }, { status:500 })
  }
}