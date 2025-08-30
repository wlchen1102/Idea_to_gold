import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/types'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// 简单的内存缓存，用于Edge Runtime环境
const profileCache = new Map<string, { data: UserProfile | null; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30秒缓存

// 性能监控函数
function logPerformance(operation: string, startTime: number, userId?: string) {
  const duration = Date.now() - startTime
  console.log(`[Performance] ${operation}: ${duration}ms${userId ? ` (user: ${userId})` : ''}`)
}

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
  const startTime = Date.now()
  
  try {
    // 环境变量获取：兼容本地开发和生产环境
    let supabaseUrl: string | undefined
    let anonKey: string | undefined
    let serviceRoleKey: string | undefined
    
    // 优先尝试 process.env（本地开发）
    supabaseUrl = process.env.SUPABASE_URL
    anonKey = process.env.SUPABASE_ANON_KEY
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('[DEBUG] 使用 process.env 获取环境变量:', { 
      hasUrl: !!supabaseUrl, 
      hasAnon: !!anonKey, 
      hasService: !!serviceRoleKey 
    })
    
    // 如果 process.env 没有获取到，再尝试 getRequestContext（生产环境）
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      try {
        const { env } = getRequestContext()
        supabaseUrl = supabaseUrl || (env as { SUPABASE_URL?: string }).SUPABASE_URL
        anonKey = anonKey || (env as { SUPABASE_ANON_KEY?: string }).SUPABASE_ANON_KEY
        serviceRoleKey = serviceRoleKey || (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
        console.log('[DEBUG] 使用 getRequestContext 补充环境变量:', { 
          hasUrl: !!supabaseUrl, 
          hasAnon: !!anonKey, 
          hasService: !!serviceRoleKey 
        })
      } catch (contextError) {
        console.log('[DEBUG] getRequestContext 也失败了:', contextError)
      }
    }
    
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.log('[ERROR] 环境变量缺失:', { supabaseUrl, anonKey: anonKey?.slice(0, 10) + '...', serviceRoleKey: serviceRoleKey?.slice(0, 10) + '...' })
      return NextResponse.json({ 
        message: '服务端环境变量未配置', 
        debug: { hasUrl: !!supabaseUrl, hasAnon: !!anonKey, hasService: !!serviceRoleKey }
      }, { status: 500 })
    }

    const authHeader = request.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '未授权' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    // 先尝试从 JWT 解析 userId 用于缓存检查
    const parsedUid = parseJwtSub(token)
    
    // 检查缓存
    if (parsedUid) {
      const cached = profileCache.get(parsedUid)
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        logPerformance('GET /api/users/me/profile (cached)', startTime, parsedUid)
        return NextResponse.json({ message: 'ok', profile: cached.data }, { status: 200 })
      }
    }

    // 使用anon密钥验证token
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    // 使用service_role密钥进行数据库操作
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const dbStartTime = Date.now()

    // 并行优化：先尝试从 JWT 里解析出 userId，若成功则提前发起 profile 查询
    const profilePromise = parsedUid
      ? supabaseAdmin
          .from('profiles')
          .select('id,nickname,avatar_url,bio')
          .eq('id', parsedUid)
          .maybeSingle()
      : null

    // 与鉴权并行
    const authPromise = supabaseAuth.auth.getUser(token)

    // 等待鉴权结果（安全兜底）
    const { data: userInfo, error: authErr } = await authPromise
    if (authErr || !userInfo?.user?.id) {
      return NextResponse.json({ message: '访问令牌无效或已过期' }, { status: 401 })
    }

    // 若已提前查询，则直接拿结果；否则使用鉴权返回的 id 再查一次
    const { data, error } = profilePromise
      ? await profilePromise
      : await supabaseAdmin
          .from('profiles')
          .select('id,nickname,avatar_url,bio')
          .eq('id', userInfo.user.id)
          .maybeSingle()

    logPerformance('Database queries', dbStartTime, userInfo.user.id)

    if (error) {
      return NextResponse.json({ message: '查询失败', error: error.message }, { status: 500 })
    }

    const profile = data ?? null
    
    // 更新缓存
    profileCache.set(userInfo.user.id, { data: profile, timestamp: Date.now() })
    
    // 清理过期缓存（简单的清理策略）
    if (profileCache.size > 100) {
      const now = Date.now()
      for (const [key, value] of profileCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          profileCache.delete(key)
        }
      }
    }

    logPerformance('GET /api/users/me/profile (total)', startTime, userInfo.user.id)
    return NextResponse.json({ message: 'ok', profile }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    const stack = e instanceof Error ? e.stack : 'no stack'
    console.error('[ERROR] API /api/users/me/profile 发生错误:', { message: msg, stack })
    logPerformance('GET /api/users/me/profile (error)', startTime)
    return NextResponse.json({ 
      message: '服务器内部错误', 
      error: msg,
      stack: stack?.split('\n').slice(0, 5).join('\n') // 只显示前5行堆栈
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    // 环境变量获取：兼容本地开发和生产环境
    let supabaseUrl: string | undefined
    let anonKey: string | undefined
    let serviceRoleKey: string | undefined
    
    try {
      // 生产环境：使用 getRequestContext 获取环境变量
      const { env } = getRequestContext()
      supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
      anonKey = (env as { SUPABASE_ANON_KEY?: string }).SUPABASE_ANON_KEY
      serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY
    } catch {
      // 本地开发环境：使用 process.env 获取环境变量
      supabaseUrl = process.env.SUPABASE_URL
      anonKey = process.env.SUPABASE_ANON_KEY
      serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    }
    
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return NextResponse.json({ message:'服务端环境变量未配置' }, { status:500 })

    const authHeader = request.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ message:'未授权' }, { status:401 })
    const token = authHeader.slice(7)

    const body = await request.json().catch(()=>null) as Partial<UserProfile> | null
    if (!body) return NextResponse.json({ message:'请求体解析失败' }, { status:400 })

    // 使用anon密钥验证token
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    // 使用service_role密钥进行数据库操作
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: userInfo, error: authErr } = await supabaseAuth.auth.getUser(token)
    if (authErr || !userInfo?.user?.id) return NextResponse.json({ message:'访问令牌无效或已过期' }, { status:401 })

    type ProfilePatch = { nickname?: string; avatar_url?: string; bio?: string }
    const safeBody = body as unknown as ProfilePatch

    const dbStartTime = Date.now()
    
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        nickname: safeBody.nickname ?? undefined,
        avatar_url: safeBody.avatar_url ?? undefined,
        bio: safeBody.bio ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userInfo.user.id)

    logPerformance('Database update', dbStartTime, userInfo.user.id)

    if (error) return NextResponse.json({ message:'更新失败', error: error.message }, { status:500 })

    // 清除缓存，确保下次获取最新数据
    profileCache.delete(userInfo.user.id)

    logPerformance('PATCH /api/users/me/profile (total)', startTime, userInfo.user.id)
    return NextResponse.json({ message:'更新成功' }, { status:200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    logPerformance('PATCH /api/users/me/profile (error)', startTime)
    return NextResponse.json({ message:'服务器内部错误', error: msg }, { status:500 })
  }
}