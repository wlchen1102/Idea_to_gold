import { createClient } from '@supabase/supabase-js'

// 兼容两种环境变量命名：NEXT_PUBLIC_*（Next.js 约定）与 VITE_*（项目文档约定）
const supabaseUrl =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined
const supabaseAnonKey =
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as string | undefined

// 创建 Supabase 客户端（仅在浏览器环境且变量齐全时）
export const supabase =
  typeof window !== 'undefined' && !!supabaseUrl && !!supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

// 强制获取客户端：在缺少环境变量或未初始化时给出明确错误
export function requireSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '缺少 Supabase 前端环境变量，请配置以下任一组合：\n' +
        '1) NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
        '或\n' +
        '2) VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY'
    )
  }

  if (!supabase) {
    throw new Error('Supabase 客户端未初始化，请刷新页面或检查环境变量')
  }

  return supabase
}