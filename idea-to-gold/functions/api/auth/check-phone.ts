import { createClient } from '@supabase/supabase-js'
import type { CloudflareContext } from '../../types'

// Cloudflare Pages Function: handle POST /api/auth/check-phone
// 检查手机号是否已经注册
export async function onRequestPost(context: CloudflareContext): Promise<Response> {
  try {
    // 1) 解析请求体
    const body = await context.request.json().catch(() => null) as { phone?: string } | null
    const phone = body?.phone

    if (!phone) {
      return new Response(
        JSON.stringify({ message: '缺少必填字段：phone' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 工具方法：统一手机号格式为"去除+号且包含国家码"的数字串
    // 目前仅支持中国大陆：+86 + 11位，以1开头
    const normalizeCnPhoneNoPlus = (raw: string) => {
      const s = (raw || '').trim()
      if (!s) return ''
      // 去除空格、横线等非数字字符
      const digits = s.replace(/[^\d]/g, '')
      // 如果是 86 开头且总长 13（86 + 11位），直接返回
      if (digits.startsWith('86') && digits.length === 13) return digits
      // 如果是 11 位大陆手机号，补上 86 前缀
      if (/^1[3-9]\d{9}$/.test(digits)) return '86' + digits
      // 其他情况，直接返回数字形式（兜底）
      return digits
    }

    // 2) 从服务端环境变量读取 Supabase 配置
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          message: '服务端环境变量未配置',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3) 初始化 Supabase 服务端客户端（使用 Service Role Key）
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 4) 使用 Auth Admin API 查询用户是否存在
    // 注意：这里使用 listUsers 并筛选手机号，而不是直接查询 auth.users 表
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error) {
      return new Response(
        JSON.stringify({ message: '查询失败', error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 5) 检查是否存在该手机号的用户（忽略前端是否带+号的差异）
    const normalizedInput = normalizeCnPhoneNoPlus(phone)
    const existingUser = users?.users?.find(user => normalizeCnPhoneNoPlus(user.phone || '') === normalizedInput)
    const exists = !!existingUser

    return new Response(
      JSON.stringify({
        exists,
        message: exists ? '手机号已注册，请直接登录' : '手机号未注册，请先注册'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}