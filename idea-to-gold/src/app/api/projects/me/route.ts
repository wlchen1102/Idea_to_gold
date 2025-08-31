// Next.js Route Handler - 获取当前用户的项目列表
// 功能与作用：
// - 提供 GET /api/projects/me 接口，用于获取当前用户创建的所有项目
// - 按"客户端认证 + 服务端验证"模式，从 Authorization: Bearer <token> 验证用户
// - 使用 Supabase service_role 执行数据库查询，并进行服务端字段校验
// - 运行于 Edge Runtime，兼容 Cloudflare Pages

export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

// GET /api/projects/me - 获取当前用户的项目列表
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    // 解析并校验认证头
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 验证 token 并获取用户信息
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token)
    const userId = authData?.user?.id || ''
    if (authErr || !userId) {
      return NextResponse.json({ message: '认证令牌无效，请重新登录' }, { status: 401 })
    }

    // 查询用户的项目列表，包含关联的创意信息
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        updated_at,
        creative:creative_id (
          id,
          title,
          slug
        )
      `)
      .eq('developer_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('查询用户项目列表失败:', error)
      return NextResponse.json({ message: '查询项目列表失败' }, { status: 500 })
    }

    // 转换数据格式以匹配前端期望的结构
    const formattedProjects = (projects || []).map(project => ({
      id: project.id,
      name: project.name,
      status: getStatusDisplayName(project.status),
      intro: project.description,
      fromIdeaTitle: project.creative?.title || '未知创意',
      fromIdeaHref: project.creative?.slug ? `/creatives/${project.creative.slug}` : '#',
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      // 注意：views 和 supports 需要从其他表获取，这里先设为0
      // 后续可以通过关联查询或单独的统计表来获取真实数据
      views: 0,
      supports: 0
    }))

    return NextResponse.json({
      success: true,
      data: formattedProjects,
      total: formattedProjects.length
    })

  } catch (error) {
    console.error('获取用户项目列表时发生错误:', error)
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 })
  }
}

// 将数据库状态转换为前端显示名称
function getStatusDisplayName(status: string): '规划中' | '开发中' | '内测中' | '已发布' {
  switch (status) {
    case 'planning':
      return '规划中';
    case 'developing':
      return '开发中';
    case 'testing':
      return '内测中';
    case 'released':
      return '已发布';
    default:
      return '规划中';
  }
}