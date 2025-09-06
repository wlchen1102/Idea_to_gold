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
    const missing: string[] = []
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

/**
 * R2 环境变量接口定义
 */
export interface R2EnvVars {
  r2AccountId: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2BucketName: string
  r2Endpoint: string
  /** 可选：当自定义域直接指向某个 bucket 时使用，公开URL为 `${r2PublicUrl}/${key}` */
  r2PublicUrl?: string
  /** 可选：当仅提供公共基址（如CDN）时，公开URL为 `${r2PublicBaseUrl}/${bucket}/${key}` */
  r2PublicBaseUrl?: string
}

/**
 * 获取 Cloudflare R2 相关环境变量
 * 自动适配本地开发环境(process.env)和生产环境(getRequestContext)
 * @throws {Error} 当必要的环境变量缺失时抛出错误
 */
export function getR2EnvVars(): R2EnvVars {
  let r2AccountId: string | undefined
  let r2AccessKeyId: string | undefined
  let r2SecretAccessKey: string | undefined
  let r2BucketName: string | undefined
  let r2Endpoint: string | undefined
  let r2PublicUrl: string | undefined
  let r2PublicBaseUrl: string | undefined

  // 优先使用 process.env (本地开发)
  if (typeof process !== 'undefined' && process.env) {
    r2AccountId = process.env.R2_ACCOUNT_ID
    r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
    r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    r2BucketName = process.env.R2_BUCKET_NAME
    r2Endpoint = process.env.R2_ENDPOINT
    r2PublicUrl = process.env.R2_PUBLIC_URL
    r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL
  }

  // 再尝试从 getRequestContext.env (生产)
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName || !r2Endpoint || !r2PublicUrl || !r2PublicBaseUrl) {
    try {
      const context = getRequestContext()
      if (context && context.env) {
        const env = context.env as Record<string, string>
        r2AccountId = r2AccountId || env.R2_ACCOUNT_ID
        r2AccessKeyId = r2AccessKeyId || env.R2_ACCESS_KEY_ID
        r2SecretAccessKey = r2SecretAccessKey || env.R2_SECRET_ACCESS_KEY
        r2BucketName = r2BucketName || env.R2_BUCKET_NAME
        r2Endpoint = r2Endpoint || env.R2_ENDPOINT
        r2PublicUrl = r2PublicUrl || env.R2_PUBLIC_URL
        r2PublicBaseUrl = r2PublicBaseUrl || env.R2_PUBLIC_BASE_URL
      }
    } catch (error) {
      console.log('无法获取 getRequestContext（R2），可能在本地开发环境:', error)
    }
  }

  // 校验必需项
  const missing: string[] = []
  if (!r2AccountId) missing.push('R2_ACCOUNT_ID')
  if (!r2AccessKeyId) missing.push('R2_ACCESS_KEY_ID')
  if (!r2SecretAccessKey) missing.push('R2_SECRET_ACCESS_KEY')
  if (!r2BucketName) missing.push('R2_BUCKET_NAME')
  if (!r2Endpoint) missing.push('R2_ENDPOINT')

  if (missing.length > 0) {
    throw new Error(`缺少必要的 R2 环境变量: ${missing.join(', ')}`)
  }

  return {
    r2AccountId: r2AccountId!,
    r2AccessKeyId: r2AccessKeyId!,
    r2SecretAccessKey: r2SecretAccessKey!,
    r2BucketName: r2BucketName!,
    r2Endpoint: r2Endpoint!,
    r2PublicUrl,
    r2PublicBaseUrl
  }
}