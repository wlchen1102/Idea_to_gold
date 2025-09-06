// 产品创建 API 路由（Edge Runtime）
// 作用：接收前端提交的产品数据，校验并写入 public.products 表；
// - 认证：读取 Authorization: Bearer {token}，用 service_role 校验并获取当前用户；
// - 关联：如果传入 project_id，则要求该项目归当前用户（developer）；creative_id 可选；
// - 约束：避免同一个 project_id 重复发布产品（表上有唯一约束，接口侧也提前检查并返回 409）。
// - 入参：JSON 格式，字段见下方解析；logo_url 与 screenshots 暂接收为 URL（可为 data:URL）。

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminEnvVars } from '@/lib/env'

export const runtime = 'edge'

// 允许的产品类型集合
const ALLOWED_PRODUCT_TYPES = new Set(['web', 'mobile', 'desktop', 'other'])

// POST /api/products - 创建新产品
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabaseUrl, serviceRoleKey } = getAdminEnvVars()
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 })
    }

    // 认证头解析
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 验证 token 并获取当前用户
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    const currentUserId = authData?.user?.id || ''
    if (authError || !currentUserId) {
      return NextResponse.json({ message: '认证令牌无效，请重新登录' }, { status: 401 })
    }

    // 解析 JSON 请求体
    const body = (await request.json().catch(() => null)) as {
      project_id?: string | null
      creative_id?: string | null
      name?: string
      slogan?: string
      logo_url?: string
      screenshots?: string[]
      description?: string
      product_types?: string[]
      access_info?: Record<string, unknown>
    } | null

    if (!body) {
      return NextResponse.json({ message: '请求体无效或为空' }, { status: 400 })
    }

    // 字段处理与校验
    const projectId = (body.project_id || '').trim() || null
    const creativeId = (body.creative_id || '').trim() || null
    const name = (body.name || '').trim()
    const slogan = (body.slogan || '').trim()
    const logoUrl = (body.logo_url || '').trim()
    const description = (body.description || '').trim()
    const productTypesRaw = Array.isArray(body.product_types) ? body.product_types : []
    const productTypes = productTypesRaw
      .map((t) => String(t || '').toLowerCase().trim())
      .filter((t) => ALLOWED_PRODUCT_TYPES.has(t))
    const screenshots = Array.isArray(body.screenshots) ? body.screenshots.map((s) => String(s || '').trim()).filter(Boolean) : []
    const accessInfo = (body.access_info && typeof body.access_info === 'object') ? body.access_info : {}

    if (!name) return NextResponse.json({ message: '缺少必填字段：name' }, { status: 400 })
    if (!slogan) return NextResponse.json({ message: '缺少必填字段：slogan' }, { status: 400 })
    if (!logoUrl) return NextResponse.json({ message: '缺少必填字段：logo_url' }, { status: 400 })
    if (!description) return NextResponse.json({ message: '缺少必填字段：description' }, { status: 400 })
    if (!productTypes.length) return NextResponse.json({ message: '缺少必填字段：product_types' }, { status: 400 })
    if (!screenshots.length) return NextResponse.json({ message: '至少需要 1 张截图：screenshots' }, { status: 400 })

    // 如果带有 project_id，检查归属与唯一性
    if (projectId) {
      // 项目归属校验：必须是当前用户的项目（developer_id = currentUserId）
      const { data: project, error: projectErr } = await supabaseAdmin
        .from('projects')
        .select('id, developer_id')
        .eq('id', projectId)
        .is('is_deleted', false)
        .single()

      if (projectErr || !project) {
        return NextResponse.json({ message: '项目不存在或已删除' }, { status: 404 })
      }
      if (project.developer_id !== currentUserId) {
        return NextResponse.json({ message: '无权限：该项目不属于当前用户' }, { status: 403 })
      }

      // 唯一性检查：同一项目不可重复发布产品
      const { data: existing, error: existErr } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('project_id', projectId)
        .limit(1)
        .maybeSingle()

      if (existErr) {
        // 查询错误（通常不会发生），返回 500
        return NextResponse.json({ message: '检查已发布产品失败', error: existErr.message }, { status: 500 })
      }
      if (existing) {
        return NextResponse.json({ message: '该项目已发布过产品，不能重复发布' }, { status: 409 })
      }
    }

    // 插入 products
    const insertPayload = {
      project_id: projectId,
      creative_id: creativeId,
      author_id: currentUserId,
      name,
      slogan,
      logo_url: logoUrl,
      screenshots,
      description,
      product_types: productTypes,
      access_info: accessInfo,
      // published_at 与 updated_at 走数据库默认值
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('products')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertErr) {
      // 捕获唯一约束/检查约束等数据库错误
      const message = insertErr.message || '创建产品失败'
      const isUnique = message.includes('unique') || message.includes('already exists')
      return NextResponse.json({ message: isUnique ? '该项目已发布过产品，不能重复发布' : '创建产品失败', error: message }, {
        status: isUnique ? 409 : 500,
      })
    }

    return NextResponse.json({ message: 'ok', product_id: inserted?.id || null }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ message: '服务端异常', error: message }, { status: 500 })
  }
}