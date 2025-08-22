// 公共类型定义（后端专用）
export interface ApiResponse { message: string; error?: string }

export interface AuthResponse extends ApiResponse {
  userId?: string | null
  session?: {
    access_token: string
    refresh_token: string
    expires_at?: number
    [key: string]: unknown
  } | null
}

export interface CheckResponse extends ApiResponse { exists: boolean }

export interface UserProfile {
  id: string
  nickname: string | null
  bio: string | null
  avatar_url: string | null
}