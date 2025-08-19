import { createClient } from '@supabase/supabase-js'

// 从环境变量中获取 Supabase 的 URL 和 anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 创建 Supabase 客户端，只有在浏览器环境且环境变量可用时才创建
export const supabase = typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// 用于在需要时抛出环境变量错误
export function requireSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('环境变量 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 必须在 .env.local 或 Cloudflare Pages 中配置')
  }
  
  if (!supabase) {
    throw new Error('Supabase 客户端未初始化')
  }
  
  return supabase
}