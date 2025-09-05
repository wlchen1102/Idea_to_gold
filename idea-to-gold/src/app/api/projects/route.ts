// Next.js Route Handler - 获取所有公开项目
// 功能与作用：
// - 提供 GET /api/projects 接口，用于获取产品广场的所有公开项目列表
// - 返回项目基本信息、关联创意信息和开发者信息
// - 运行于 Edge Runtime，兼容 Cloudflare Pages

export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

// GET /api/projects - 获取产品广场的公开项目列表
export async function GET(): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 查询所有公开项目（未删除的项目），关联创意和开发者信息
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        updated_at,
        creative:creatives!inner(
          id,
          title,
          description,
          author:profiles!creatives_author_id_fkey(
            id,
            nickname,
            avatar_url
          )
        ),
        developer:profiles!projects_developer_id_fkey(
          id,
          nickname,
          avatar_url
        )
      `)
      .is('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ message: '获取项目列表失败', error: error.message }, { status: 500 })
    }

    // 转换状态显示名称
    const statusMap: Record<string, string> = {
      planning: '规划中',
      developing: '开发中',
      completed: '已完成',
      paused: '已暂停',
      cancelled: '已取消'
    }

    const formattedProjects = (projects || []).map(project => ({
      ...project,
      status_display: statusMap[project.status] || project.status
    }))

    return NextResponse.json({ projects: formattedProjects }, { status: 200 })
  } catch (e) {
    const error = e as Error
    return NextResponse.json({ message: '服务器内部错误', error: error.message }, { status: 500 })
  }
}