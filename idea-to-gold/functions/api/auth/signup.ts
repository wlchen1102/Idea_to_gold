import { createClient } from '@supabase/supabase-js'
import type { CloudflareContext } from '../../types'

// 生成头像相关的工具函数
// 高饱和度、漂亮的颜色集合（十六进制）
const SATURATED_COLORS: string[] = ['#2ECC71', '#3498DB', '#E74C3C', '#F1C40F', '#9B59B6', '#1ABC9C']

// 随机取色
function pickRandomColor(): string {
  const idx = Math.floor(Math.random() * SATURATED_COLORS.length)
  return SATURATED_COLORS[idx]
}

// 提取展示字符：中文取后2位，英文取前2位（转大写）；若没有字母则取数字；不足2位则原样返回
function extractAvatarText(inputRaw: string | undefined | null): string {
  const input = (inputRaw || '').trim()
  if (!input) return 'U'

  // 抽取中文字符
  const chineseChars = Array.from(input).filter((ch) => /[\u4e00-\u9fa5]/.test(ch))
  if (chineseChars.length > 0) {
    const lastTwo = chineseChars.slice(-2).join('')
    return lastTwo || chineseChars[chineseChars.length - 1] || '用'
  }

  // 英文字符（A-Z）优先
  const letters = input.replace(/[^a-zA-Z]/g, '').toUpperCase()
  if (letters.length > 0) {
    return letters.slice(0, 2)
  }

  // 若没有字母，取数字
  const digits = input.replace(/\D/g, '')
  if (digits.length > 0) {
    return digits.slice(-2) // 取后2位数字
  }

  return 'U'
}

// 拼接 UI Avatars URL（去掉#，设置白色字体、128尺寸、加粗）
function buildUiAvatarUrl(name: string, bgColorHex: string): string {
  const bg = bgColorHex.replace('#', '').toUpperCase()
  const encName = encodeURIComponent(name)
  return `https://ui-avatars.com/api/?name=${encName}&background=${bg}&color=fff&size=128&bold=true`
}

// 服务器端：校验 E.164 手机号格式，避免将无效手机号提交给 Supabase
function isValidE164Phone(phone: string): boolean {
  // +开头，后面7-15位数字（E.164 通用范围）
  return /^\+\d{7,15}$/.test(phone)
}

// 统一错误归一化，返回友好提示
function normalizeAuthError(err: unknown, channel: 'phone' | 'email'): { status: number; message: string; raw?: string } {
  const raw = (typeof err === 'object' && err && 'message' in err) ? String((err as { message?: unknown }).message ?? '') : ''
  const rawLower = raw.toLowerCase()

  // 常见重复注册 / 唯一约束冲突
  if (
    rawLower.includes('already registered') ||
    rawLower.includes('duplicate key value') ||
    rawLower.includes('users_phone_key') ||
    rawLower.includes('users_email_key') ||
    rawLower.includes('user already exists')
  ) {
    return { status: 409, message: channel === 'phone' ? '该手机号已注册，请直接登录或找回密码' : '该邮箱已注册，请直接登录或找回密码', raw }
  }

  // 密码长度
  if (rawLower.includes('password') && rawLower.includes('at least')) {
    return { status: 400, message: '密码至少6位，请重新设置一个更安全的密码', raw }
  }

  // 邮箱格式
  if (rawLower.includes('invalid email')) {
    return { status: 400, message: '邮箱格式不正确，请检查后重试', raw }
  }

  // 默认兜底
  return { status: 400, message: '注册失败，请稍后重试', raw }
}

// Cloudflare Pages Function: handle POST /api/auth/signup
export async function onRequestPost(context: CloudflareContext): Promise<Response> {
  try {
    // 1) 解析请求体
    const body = await context.request.json().catch(() => null) as { phone?: string; email?: string; password?: string; nickname?: string } | null
    const phone = body?.phone as string | undefined
    const email = body?.email as string | undefined
    const password = body?.password as string | undefined

    if ((!phone && !email) || !password) {
      return new Response(
        JSON.stringify({ message: '缺少必填字段：email/phone 和 password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2) 从服务端环境变量读取 Supabase 配置（必须在 Cloudflare Pages 上配置）
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          message: '服务端环境变量未配置：请在 Cloudflare Pages 项目设置的 Environment Variables 中配置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3) 初始化 Supabase 服务端客户端（使用 Service Role Key）
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch }, // 适配 Cloudflare Workers 环境
    })

    // 4) 分支处理：仅手机号注册走 Admin 路径以绕过 OTP 验证，邮箱注册保持标准流程
    if (phone) {
      // 后端兜底校验：必须是 E.164
      if (!isValidE164Phone(phone)) {
        return new Response(
          JSON.stringify({ message: '手机号格式无效，请输入有效的 E.164 格式（如 +8613xxxxxxxxx）' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 准备用户元数据
      const userMetadata: Record<string, unknown> = {}
      if (typeof body?.nickname === 'string' && body.nickname.trim()) {
        userMetadata.nickname = body.nickname.trim()
      }

      // 使用 Admin SDK 创建已验证的手机号用户（必须使用 Service Role Key，严禁在前端使用）
      const { data, error } = await supabase.auth.admin.createUser({
        phone,
        password,
        phone_confirm: true, // 直接标记为已验证，跳过短信 OTP
        user_metadata: userMetadata, // 将 nickname 写入用户元数据
      })

      // 5) 处理 Supabase 返回的结果
      if (error) {
        const friendly = normalizeAuthError(error, 'phone')
        // 记录详细日志（仅服务端控制台），便于排查
        console.error('手机号注册失败：', { error: error.message, phoneMasked: phone.replace(/.(?=. {4})/g, '*') })
        return new Response(
          JSON.stringify({ message: friendly.message, error: error.message }),
          { status: friendly.status, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 6) 生成并更新默认头像（手机号注册）
      try {
        const userId = data.user?.id
        if (userId) {
          // 名称优先级：请求体 nickname（若有）> 手机号
          const nameSource: string = (typeof body?.nickname === 'string' && body.nickname.trim())
            ? body.nickname.trim()
            : String(phone)
          const display = extractAvatarText(nameSource)
          const color = pickRandomColor()
          const avatarUrl = buildUiAvatarUrl(display, color)
          const updates: Record<string, unknown> = { avatar_url: avatarUrl }
          if (typeof body?.nickname === 'string' && body.nickname.trim()) {
            updates.nickname = body.nickname.trim()
          }
          await supabase.from('profiles').upsert([{ id: userId, ...updates }], { onConflict: 'id' })
        }
      } catch (e) {
        // 静默失败，不影响主流程
        console.warn('生成/更新默认头像失败(手机号注册)：', e)
      }

      return new Response(
        JSON.stringify({
          message: '注册成功',
          userId: data.user?.id ?? null,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      // 邮箱注册仍使用标准 signUp（是否需要邮件验证由项目设置决定）
      const { data, error } = await supabase.auth.signUp({
        email: email as string,
        password: password as string,
        options: {
          data: (typeof body?.nickname === 'string' && body.nickname.trim()) ? { nickname: body.nickname.trim() } : undefined
        }
      })

      if (error) {
        const friendly = normalizeAuthError(error, 'email')
        console.error('邮箱注册失败：', { error: error.message, emailMasked: (email || '').replace(/^(.).+(@.+)$/,'$1***$2') })
        return new Response(
          JSON.stringify({ message: friendly.message, error: error.message }),
          { status: friendly.status, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 生成并更新默认头像（邮箱注册）
      try {
        const userId = data.user?.id
        if (userId) {
          // 名称优先级：请求体 nickname（若有）> 邮箱前缀
          const nameSource: string = (typeof body?.nickname === 'string' && body.nickname.trim())
            ? body.nickname.trim()
            : String(email || '').split('@')[0]
          const display = extractAvatarText(nameSource)
          const color = pickRandomColor()
          const avatarUrl = buildUiAvatarUrl(display, color)
          const updates: Record<string, unknown> = { avatar_url: avatarUrl }
          if (typeof body?.nickname === 'string' && body.nickname.trim()) {
            updates.nickname = body.nickname.trim()
          }
          await supabase.from('profiles').upsert([{ id: userId, ...updates }], { onConflict: 'id' })
        }
      } catch (e) {
        // 静默失败，不影响主流程
        console.warn('生成/更新默认头像失败(邮箱注册)：', e)
      }

      return new Response(
        JSON.stringify({
          message: '注册成功',
          userId: data.user?.id ?? null,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    console.error('注册接口内部错误：', e)
    return new Response(
      JSON.stringify({ message: '服务器内部错误', error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}