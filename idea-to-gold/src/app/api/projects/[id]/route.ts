// Next.js Route Handler - 项目详情与维护（GET/PATCH/DELETE /api/projects/[id]）
// 功能与作用：
// - GET：提供公开的项目详情查询能力（无须登录），对已软删除的项目返回 404
// - PATCH：仅项目所有者可更新 name/description，若项目已软删除则拒绝修改
// - DELETE：仅项目所有者可软删除（is_deleted=true, deleted_at=now()），released 状态不可删除
// - 运行于 Edge Runtime，遵循 Cloudflare Pages + Next.js App Router 的约定

export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

// 项目详情返回的类型（与文档 6.1 对齐，精简必要字段）
interface ProjectDetailResponse {
  message: string
  project?: {
    id: string
    name: string
    description: string | null
    status: string
    developer?: { id: string; nickname: string | null; avatar_url: string | null }
    fromIdea?: { id: string; title: string | null }
    product_info?: Record<string, unknown> | null
    metrics?: { favorites?: number }
    created_at?: string
    updated_at?: string
  }
  error?: string
}

// GET /api/projects/[id] - 公开获取项目详情
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const awaitedParams = await params
    const projectId = awaitedParams?.id
    if (!projectId) {
      return NextResponse.json({ message: '缺少或非法的参数：id' }, { status: 400 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 1) 基础项目数据
    const { data: projectRow, error: projectErr } = await supabaseAdmin
      .from('projects')
      .select('id, name, description, status, developer_id, creative_id, product_info, created_at, updated_at, is_deleted, deleted_at')
      .eq('id', projectId)
      .maybeSingle()

    if (projectErr) {
      return NextResponse.json({ message: '数据库查询失败（项目）', error: projectErr.message }, { status: 500 })
    }
    if (!projectRow) {
      return NextResponse.json({ message: '未找到项目' }, { status: 404 })
    }
    // 新增：若项目已软删除，则隐藏
    const isDeleted = (projectRow as { is_deleted?: boolean }).is_deleted === true
    if (isDeleted) {
      return NextResponse.json({ message: '未找到项目' }, { status: 404 })
    }

    // 2) 关联开发者 profiles（可选）
    let developer: { id: string; nickname: string | null; avatar_url: string | null } | undefined
    if ((projectRow as { developer_id?: string }).developer_id) {
      const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('id, nickname, avatar_url')
        .eq('id', (projectRow as { developer_id: string }).developer_id)
        .maybeSingle()
      if (profileRow) {
        developer = {
          id: profileRow.id as string,
          nickname: (profileRow as { nickname: string | null }).nickname ?? null,
          avatar_url: (profileRow as { avatar_url: string | null }).avatar_url ?? null,
        }
      }
    }

    // 3) 关联来源创意 creatives（可选）
    let fromIdea: { id: string; title: string | null } | undefined
    if ((projectRow as { creative_id?: string }).creative_id) {
      const { data: ideaRow } = await supabaseAdmin
        .from('creatives')
        .select('id, title')
        .eq('id', (projectRow as { creative_id: string }).creative_id)
        .maybeSingle()
      if (ideaRow) {
        fromIdea = { id: ideaRow.id as string, title: (ideaRow as { title: string | null }).title ?? null }
      }
    }

    // 4) 统计指标（favorites）。若表不存在或查询失败，不影响主流程。
    let favoritesCount: number | undefined
    try {
      const { count } = await supabaseAdmin
        .from('project_favorites')
        .select('id', { head: true, count: 'exact' })
        .eq('project_id', projectId)
      if (typeof count === 'number') favoritesCount = count
    } catch (_e) {
      // 忽略：可能表尚未创建
    }

    const response: ProjectDetailResponse = {
      message: '获取成功',
      project: {
        id: projectRow.id as string,
        name: projectRow.name as string,
        description: (projectRow as { description: string | null }).description ?? null,
        status: projectRow.status as string,
        developer,
        fromIdea,
        product_info: (projectRow as { product_info?: Record<string, unknown> | null }).product_info ?? null,
        metrics: favoritesCount !== undefined ? { favorites: favoritesCount } : {},
        created_at: (projectRow as { created_at?: string }).created_at,
        updated_at: (projectRow as { updated_at?: string }).updated_at,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg } satisfies ProjectDetailResponse, { status: 500 })
  }
}

// PATCH /api/projects/[id] - 仅项目所有者可更新项目名称与描述
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const awaitedParams = await params
    const projectId = awaitedParams?.id
    if (!projectId) {
      return NextResponse.json({ message: '缺少或非法的参数：id' }, { status: 400 })
    }

    // 解析认证头
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 })
    }

    // 使用 service_role 验证用户身份
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    const currentUserId = userData?.user?.id ?? ''
    if (authError || !currentUserId) {
      return NextResponse.json({ message: '认证令牌无效，请重新登录' }, { status: 401 })
    }

    // 读取现有项目并校验所有权（developer_id 必须等于当前用户）
    const { data: existing, error: readErr } = await supabase
      .from('projects')
      .select('id, developer_id, is_deleted')
      .eq('id', projectId)
      .maybeSingle()

    if (readErr) {
      return NextResponse.json({ message: '数据库查询失败（项目）', error: readErr.message }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ message: '未找到项目' }, { status: 404 })
    }

    const ownerId = (existing as { developer_id?: string | null })?.developer_id ?? null
    if (!ownerId || ownerId !== currentUserId) {
      return NextResponse.json({ message: '无权限：只有项目所有者可以更新此项目' }, { status: 403 })
    }
    // 新增：已删除项目禁止修改
    const isDeletedForPatch = (existing as { is_deleted?: boolean }).is_deleted === true
    if (isDeletedForPatch) {
      return NextResponse.json({ message: '项目已删除，禁止修改' }, { status: 410 })
    }

    // 解析并校验请求体
    const body = (await request.json().catch(() => null)) as { name?: string; description?: string } | null
    const rawName = body?.name
    const rawDesc = body?.description

    const name = typeof rawName === 'string' ? rawName.trim() : undefined
    const description = typeof rawDesc === 'string' ? rawDesc.trim() : undefined

    if (name === undefined && description === undefined) {
      return NextResponse.json({ message: '请求体至少包含 name 或 description' }, { status: 400 })
    }

    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ message: 'name 不能为空字符串' }, { status: 400 })
    }
    if (description !== undefined && description.length === 0) {
      return NextResponse.json({ message: 'description 不能为空字符串' }, { status: 400 })
    }

    const updatePayload: Record<string, string> = {}
    if (name !== undefined) updatePayload.name = name
    if (description !== undefined) updatePayload.description = description

    const { data: updated, error: updateErr } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', projectId)
      .select('id, name, description, status, developer_id, creative_id, product_info, created_at, updated_at')
      .maybeSingle()

    if (updateErr) {
      return NextResponse.json({ message: '更新失败', error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ message: '更新成功', project: updated }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// DELETE /api/projects/[id] - 仅项目所有者可软删除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    const awaitedParams = await params
    const projectId = awaitedParams?.id
    if (!projectId) {
      return NextResponse.json({ message: '缺少或非法的参数：id' }, { status: 400 })
    }

    // 解析认证头
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 })
    }

    // 使用 service_role 验证用户身份
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    const currentUserId = userData?.user?.id ?? ''
    if (authError || !currentUserId) {
      return NextResponse.json({ message: '认证令牌无效，请重新登录' }, { status: 401 })
    }

    // 读取项目，检查所有权、状态与软删除标记
    const { data: proj, error: readErr2 } = await supabase
      .from('projects')
      .select('id, developer_id, status, is_deleted, deleted_at')
      .eq('id', projectId)
      .maybeSingle()

    if (readErr2) {
      return NextResponse.json({ message: '数据库查询失败（项目）', error: readErr2.message }, { status: 500 })
    }
    if (!proj) {
      return NextResponse.json({ message: '未找到项目' }, { status: 404 })
    }

    const ownerId2 = (proj as { developer_id?: string | null })?.developer_id ?? null
    if (!ownerId2 || ownerId2 !== currentUserId) {
      return NextResponse.json({ message: '无权限：只有项目所有者可以删除此项目' }, { status: 403 })
    }

    // released 状态不可删除（依据 PRD）
    const status = (proj as { status?: string }).status || ''
    if (status === 'released') {
      return NextResponse.json({ message: '已发布项目不可删除' }, { status: 400 })
    }

    // 已删除则幂等返回
    const alreadyDeleted = (proj as { is_deleted?: boolean }).is_deleted === true
    if (alreadyDeleted) {
      return NextResponse.json({ message: '已删除' }, { status: 200 })
    }

    // 执行软删除
    const { error: delErr } = await supabase
      .from('projects')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', projectId)

    if (delErr) {
      return NextResponse.json({ message: '删除失败', error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ message: '删除成功' }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}