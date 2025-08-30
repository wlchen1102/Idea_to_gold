/**
 * 后端环境变量获取工具函数
 * 统一处理本地开发环境和Cloudflare Pages生产环境的环境变量获取
 */

import { getRequestContext } from '@cloudflare/next-on-pages'

/**
 * 环境变量接口定义
 */
export interface EnvVars {
  supabaseUrl: string
  anonKey: string
  serviceRoleKey: string
}

/**
 * 获取Supabase相关的环境变量
 * 自动适配本地开发环境(process.env)和生产环境(getRequestContext)
 * 
 * @returns {EnvVars} 包含Supabase URL、匿名密钥和服务角色密钥的对象
 * @throws {Error} 当必要的环境变量缺失时抛出错误
 */
export function getEnvVars(): EnvVars {
  let supabaseUrl: string | undefined
  let anonKey: string | undefined
  let serviceRoleKey: string | undefined

  // 优先使用 process.env (本地开发环境)
  if (typeof process !== 'undefined' && process.env) {
    supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  // 如果还没有获取到，尝试从 getRequestContext (生产环境)
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    try {
      const context = getRequestContext()
      if (context && context.env) {
        const env = context.env as Record<string, string>
        supabaseUrl = supabaseUrl || env.SUPABASE_URL
        anonKey = anonKey || env.SUPABASE_ANON_KEY
        serviceRoleKey = serviceRoleKey || env.SUPABASE_SERVICE_ROLE_KEY
      }
    } catch (error) {
      console.log('无法获取 getRequestContext，可能在本地开发环境:', error)
    }
  }

  // 验证必要的环境变量是否存在
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    const missing = []
    if (!supabaseUrl) missing.push('SUPABASE_URL')
    if (!anonKey) missing.push('SUPABASE_ANON_KEY')
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    
    throw new Error(`缺少必要的环境变量: ${missing.join(', ')}`)
  }

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey
  }
}

/**
 * 获取仅包含认证相关的环境变量(不包含service role key)
 * 用于客户端认证场景
 */
export function getAuthEnvVars(): Pick<EnvVars, 'supabaseUrl' | 'anonKey'> {
  const { supabaseUrl, anonKey } = getEnvVars()
  return { supabaseUrl, anonKey }
}

/**
 * 获取仅包含管理员权限的环境变量
 * 用于需要service role权限的数据库操作
 */
export function getAdminEnvVars(): Pick<EnvVars, 'supabaseUrl' | 'serviceRoleKey'> {
  const { supabaseUrl, serviceRoleKey } = getEnvVars()
  return { supabaseUrl, serviceRoleKey }
}