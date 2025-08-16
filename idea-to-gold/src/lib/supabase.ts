import { createClient } from '@supabase/supabase-js'

// 从环境变量中获取 Supabase 的 URL 和 anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 创建并导出一个 Supabase 客户端实例
export const supabase = createClient(supabaseUrl, supabaseAnonKey)