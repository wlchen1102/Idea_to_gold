// Next.js Route Handler - 获取用户支持的创意列表
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

// 使用 Edge Runtime
export const runtime = 'edge'

// 创意数据接口
interface Creative {
  id: string
  title: string
  description: string
  terminals: string[]
  bounty_amount: number
  created_at: string
  author_id: string
  slug: string
  upvote_count: number
  comment_count: number
  profiles: {
    nickname: string | null
    avatar_url: string | null
  } | null
}

interface SupportedCreativesResponse {
  message: string
  creatives?: Creative[]
  total?: number
  error?: string
}

// GET /api/users/[userId]/supported-creatives - 获取用户支持的创意列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { message: '服务端环境变量未配置' },
        { status: 500 }
      )
    }

    const awaitedParams = await params
    const userId = awaitedParams?.userId
    if (!userId) {
      return NextResponse.json(
        { message: '缺少或非法的参数：userId' },
        { status: 400 }
      )
    }

    // 验证用户身份（可选：检查当前用户是否有权限查看）
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    let currentUserId: string | null = null
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token)
      currentUserId = userData?.user?.id ?? null
    }

    // 获取分页参数
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    console.log(`[SUPPORTED_CREATIVES] 获取用户 ${userId} 支持的创意，页码: ${page}, 限制: ${limit}`)

    // 使用优化的数据库函数一次性获取所有数据
    const { data: supportedData, error: supportedError } = await supabase
      .rpc('get_user_supported_creatives', {
        user_id: userId,
        page_limit: limit,
        page_offset: offset
      })

    if (supportedError) {
      console.error('[SUPPORTED_CREATIVES_RPC_ERROR]', supportedError)
      return NextResponse.json(
        { 
          message: '数据库查询失败', 
          error: supportedError.message 
        } satisfies Partial<SupportedCreativesResponse>,
        { status: 500 }
      )
    }

    if (!supportedData || supportedData.length === 0) {
      return NextResponse.json({
        message: '获取支持的创意成功',
        creatives: [],
        total: 0
      } satisfies SupportedCreativesResponse)
    }

    // 转换数据格式
    const creatives: Creative[] = supportedData.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      terminals: item.terminals || [],
      bounty_amount: item.bounty_amount || 0,
      created_at: item.created_at,
      author_id: item.author_id,
      slug: item.slug,
      upvote_count: item.upvote_count || 0,
      comment_count: item.comment_count || 0,
      profiles: item.profiles || null
    }))

    // 获取总数（从第一条记录中获取）
    const totalCount = supportedData[0]?.total_count || 0

    console.log(`[SUPPORTED_CREATIVES] 成功获取 ${creatives.length} 个支持的创意，总数: ${totalCount}`)

    return NextResponse.json({
      message: '获取支持的创意成功',
      creatives: creatives,
      total: totalCount
    } satisfies SupportedCreativesResponse)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    console.error('[SUPPORTED_CREATIVES_FATAL]', errorMessage)
    return NextResponse.json(
      { 
        message: '服务器内部错误', 
        error: errorMessage 
      } satisfies Partial<SupportedCreativesResponse>,
      { status: 500 }
    )
  }
}