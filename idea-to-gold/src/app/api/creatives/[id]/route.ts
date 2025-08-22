// Next.js Route Handler - 获取单个创意
// 迁移自 functions/api/creatives/[id]/index.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestContext } from '@cloudflare/next-on-pages'

// 使用 Edge Runtime
export const runtime = 'edge'

// 从 functions/types.ts 迁移而来的类型定义
interface Creative {
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

interface CreativeResponse {
  message: string
  creative?: Creative
  error?: string
}

// GET /api/creatives/:id - 获取单个创意
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 从 Cloudflare Pages 的运行时上下文中读取环境变量
    const { env } = getRequestContext()
    const supabaseUrl = (env as { SUPABASE_URL?: string }).SUPABASE_URL
    const serviceRoleKey = (env as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { message: '服务端环境变量未配置' },
        { status: 500 }
      )
    }

    const awaitedParams = await params
    const id = awaitedParams?.id
    if (!id) {
      return NextResponse.json(
        { message: '缺少或非法的参数：id' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from('user_creatives')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { message: '查询创意失败', error: error.message } satisfies Partial<CreativeResponse>,
        { status: 404 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { message: '未找到资源' },
        { status: 404 }
      )
    }

    const creative = data as unknown as Creative

    return NextResponse.json(
      { message: '获取创意成功', creative } satisfies CreativeResponse,
      { status: 200 }
    )
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return NextResponse.json(
      { message: '服务器内部错误', error: msg },
      { status: 500 }
    )
  }
}