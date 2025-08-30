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

    // 第一步：获取用户支持的创意ID列表
    const { data: upvoteData, error: upvoteError } = await supabase
      .from('creative_upvotes')
      .select('creative_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (upvoteError) {
      console.error('[SUPPORTED_CREATIVES_UPVOTE_ERROR]', upvoteError)
      return NextResponse.json(
        { 
          message: '数据库查询失败（获取点赞记录）', 
          error: upvoteError.message 
        } satisfies Partial<SupportedCreativesResponse>,
        { status: 500 }
      )
    }

    if (!upvoteData || upvoteData.length === 0) {
      return NextResponse.json({
        message: '获取支持的创意成功',
        creatives: [],
        total: 0
      } satisfies SupportedCreativesResponse)
    }

    // 第二步：根据创意ID获取创意详情
    const creativeIds = upvoteData.map(item => item.creative_id)
    const { data: creativesData, error: creativesError } = await supabase
      .from('creatives')
      .select(`
        id,
        title,
        description,
        terminals,
        bounty_amount,
        created_at,
        author_id,
        slug,
        upvote_count,
        comment_count
      `)
      .in('id', creativeIds)
      .is('deleted_at', null)

    if (creativesError) {
      console.error('[SUPPORTED_CREATIVES_ERROR]', creativesError)
      return NextResponse.json(
        { 
          message: '数据库查询失败（获取创意详情）', 
          error: creativesError.message 
        } satisfies Partial<SupportedCreativesResponse>,
        { status: 500 }
      )
    }

    // 第三步：获取作者信息
    const authorIds = creativesData?.map(creative => creative.author_id) || []
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', authorIds)

    if (profilesError) {
      console.warn('[SUPPORTED_CREATIVES_PROFILES_ERROR]', profilesError)
    }

    // 第四步：获取总数
    const { count: totalCount, error: countError } = await supabase
      .from('creative_upvotes')
      .select('creative_id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      console.warn('[SUPPORTED_CREATIVES_COUNT_ERROR]', countError)
    }

    // 第五步：组合数据
    const profilesMap = new Map()
    profilesData?.forEach(profile => {
      profilesMap.set(profile.id, profile)
    })

    const creatives: Creative[] = (creativesData || []).map((creative: any) => ({
      id: creative.id,
      title: creative.title,
      description: creative.description,
      terminals: creative.terminals || [],
      bounty_amount: creative.bounty_amount || 0,
      created_at: creative.created_at,
      author_id: creative.author_id,
      slug: creative.slug,
      upvote_count: creative.upvote_count || 0,
      comment_count: creative.comment_count || 0,
      profiles: profilesMap.get(creative.author_id) || null
    }))

    // 按照原始点赞顺序排序
    const orderedCreatives = upvoteData.map(upvote => 
      creatives.find(creative => creative.id === upvote.creative_id)
    ).filter(Boolean) as Creative[]

    console.log(`[SUPPORTED_CREATIVES] 成功获取 ${orderedCreatives.length} 个支持的创意`)

    return NextResponse.json({
      message: '获取支持的创意成功',
      creatives: orderedCreatives,
      total: totalCount || 0
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