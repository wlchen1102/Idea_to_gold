// Cloudflare Pages Functions 类型定义
// 这些类型用于替换后端函数中的 any 类型

export interface CloudflareEnv {
  // Supabase 环境变量
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  
  // Cloudflare R2 环境变量
  R2_ACCOUNT_ID?: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_BUCKET_NAME?: string
  
  // 其他可能的环境变量
  [key: string]: string | undefined
}

export interface CloudflareRequest extends Request {
  // Cloudflare Workers 扩展的 Request 属性
}

export interface CloudflareParams {
  // 动态路由参数，如 [id] 路由中的 id
  [key: string]: string | undefined
}

export interface CloudflareContext {
  request: CloudflareRequest
  env: CloudflareEnv
  params?: CloudflareParams
  // Cloudflare Workers 的其他 context 属性
  waitUntil?: (promise: Promise<unknown>) => void
  passThroughOnException?: () => void
}

// API 响应的通用类型
export interface ApiResponse {
  message: string
  error?: string
  [key: string]: unknown
}

// 认证相关的响应类型
export interface AuthResponse extends ApiResponse {
  userId?: string | null
  session?: {
    access_token: string
    refresh_token: string
    expires_at?: number
    [key: string]: unknown
  } | null
}

export interface CheckResponse extends ApiResponse {
  exists: boolean
}

// 创意相关的响应类型
export interface Creative {
  id: string
  title: string
  description: string
  terminals: string[]
  bounty_amount: number
  created_at: string
  author_id: string
  slug: string
  profiles?: {
    nickname: string | null
    avatar_url: string | null
  } | null
}

export interface CreativesResponse extends ApiResponse {
  creatives?: Creative[]
}

export interface CreativeResponse extends ApiResponse {
  creative?: Creative
}

export interface CreateCreativeResponse extends ApiResponse {
  author_id: string
  slug: string
}

// 用户资料相关的类型
export interface UserProfile {
  id: string
  nickname: string | null
  bio: string | null
  avatar_url: string | null
}

// 错误类型
export interface AppError extends Error {
  message: string
}