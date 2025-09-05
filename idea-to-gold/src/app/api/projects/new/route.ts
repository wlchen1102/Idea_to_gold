// Next.js Route Handler - 创建新项目
// 功能与作用：
// - 提供 POST /api/projects/new 接口，用于基于创意创建新项目
// - 按"客户端认证 + 服务端验证"模式，从 Authorization: Bearer <token> 验证用户
// - 使用 Supabase service_role 执行数据库写入，并进行服务端字段校验
// - 运行于 Edge Runtime，兼容 Cloudflare Pages

export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

// 允许的项目状态（与需求对齐：初始仅 planning、developing）
const ALLOWED_STATUS = new Set(['planning', 'developing'])

// POST /api/projects/new - 创建新项目
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // 解析请求体
    const body = (await request.json().catch(() => null)) as {
      name?: string
      description?: string
      creative_id?: string
      status?: string
    } | null

    const name = (body?.name || '').trim()
    const description = (body?.description || '').trim()
    const creativeId = (body?.creative_id || '').trim()
    const status = (body?.status || 'planning').trim().toLowerCase()

    // 基础校验
    if (!name || !description || !creativeId) {
      return NextResponse.json({ message: '缺少必填字段：name、description 或 creative_id' }, { status: 400 })
    }
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ message: '非法的项目状态', error: `status 必须为 ${Array.from(ALLOWED_STATUS).join(' | ')}` }, { status: 400 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 验证 token 并获取用户信息
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token)
    const developerId = authData?.user?.id || ''
    if (authErr || !developerId) {
      return NextResponse.json({ message: '认证令牌无效，请重新登录' }, { status: 401 })
    }

    // 校验创意是否存在
    const { data: creativeRow, error: creativeErr } = await supabaseAdmin
      .from('creatives')
      .select('id')
      .eq('id', creativeId)
      .maybeSingle()

    if (creativeErr) {
      return NextResponse.json({ message: '查询创意失败', error: creativeErr.message }, { status: 500 })
    }
    if (!creativeRow?.id) {
      return NextResponse.json({ message: '关联创意不存在或已删除' }, { status: 400 })
    }

    // 写入 projects
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description,
        status,
        developer_id: developerId,
        creative_id: creativeId,
      })
      .select('id')
      .maybeSingle()

    if (insertErr) {
      return NextResponse.json({ message: '创建项目失败', error: insertErr.message }, { status: 500 })
    }

    const id = inserted?.id
    if (!id) {
      return NextResponse.json({ message: '创建项目失败：未能获取新项目ID' }, { status: 500 })
    }

    return NextResponse.json({ message: '创建成功', id }, { status: 201 })
  } catch (e) {
    const error = e as Error
    return NextResponse.json({ message: '服务器内部错误', error: error.message }, { status: 500 })
  }
}