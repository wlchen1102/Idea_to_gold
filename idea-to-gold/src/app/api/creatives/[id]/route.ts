// Next.js Route Handler - 获取单个创意
// 迁移自 functions/api/creatives/[id]/index.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars } from '@/lib/env'

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
  upvote_count?: number // 新增：点赞数量字段（若表中存在）
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
    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

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
      .from('creatives')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { message: '数据库查询失败（获取创意）', error: error.message } satisfies Partial<CreativeResponse>,
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { message: '未找到创意' },
        { status: 404 }
      )
    }

    const creative = data as unknown as Creative

    // 移除点赞数量查询以提升性能，点赞数量将由客户端异步获取
    // 这样可以大幅减少服务端渲染的延迟

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

// PATCH /api/creatives/:id - 更新单个创意（仅作者可修改）
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars()

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: '服务端环境变量未配置' }, { status: 500 });
    }

    const awaitedParams = await params;
    const idOrSlug = awaitedParams?.id;
    if (!idOrSlug) {
      return NextResponse.json({ message: '缺少或非法的参数：id' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ message: '缺少认证令牌，请先登录' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 验证 token
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const currentUserId = userData?.user?.id;
    if (authError || !currentUserId) {
      return NextResponse.json({ message: '认证令牌无效，请重新登录' }, { status: 401 });
    }

    // 读取现有记录，优先按 id 查询，若未命中则回退按 slug 查询
    let existing: { id: string; author_id: string } | null = null;
    {
      const { data, error } = await supabase
        .from('creatives')
        .select('id, author_id')
        .eq('id', idOrSlug)
        .maybeSingle();
      if (error) {
        // 如果发生了非“未命中”的错误，直接返回
        // 对 maybeSingle 来说，未命中不视为错误，data 为 null
        return NextResponse.json({ message: '数据库查询失败（按ID查找）', error: error.message }, { status: 500 });
      }
      if (data) existing = data as { id: string; author_id: string };
    }

    if (!existing) {
      const { data, error } = await supabase
        .from('creatives')
        .select('id, author_id')
        .eq('slug', idOrSlug)
        .maybeSingle();
      if (error) {
        return NextResponse.json({ message: '数据库查询失败（按Slug查找）', error: error.message }, { status: 500 });
      }
      if (data) existing = data as { id: string; author_id: string };
    }

    if (!existing) {
      return NextResponse.json({ message: '未找到创意' }, { status: 404 });
    }

    if (existing.author_id !== currentUserId) {
      return NextResponse.json({ message: '无权限：仅作者可编辑该创意' }, { status: 403 });
    }

    // 读取并校验请求体
    const body = await request.json().catch(() => null) as { title?: string; description?: string; terminals?: string[] } | null;

    // 更安全的写法：避免对 body 使用非空断言，先取出局部变量再进行类型判断
    const rawTitle = body?.title;
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';

    const rawDescription = body?.description;
    const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';

    // 安全处理可选的 terminals 字段，避免非空断言
    const terminalsCandidate = body?.terminals;
    const terminals = Array.isArray(terminalsCandidate)
      ? terminalsCandidate.filter((t): t is string => typeof t === 'string')
      : undefined;

    if (!title || !description) {
      return NextResponse.json({ message: '缺少必填字段：title 或 description' }, { status: 400 });
    }

    const updatePayload: { title: string; description: string; terminals?: string[] } = { title, description };
    if (terminals) updatePayload.terminals = terminals;

    const { error: updateError } = await supabase
      .from('creatives')
      .update(updatePayload)
      .eq('id', existing.id);

    if (updateError) {
      return NextResponse.json({ message: '更新失败', error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ message: '更新成功' }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error && e.message ? e.message : 'unknown error';
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 });
  }
}