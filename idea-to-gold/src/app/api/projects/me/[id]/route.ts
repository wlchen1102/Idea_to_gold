// 我的项目详情 API 路由（Edge Runtime）
// 功能：获取/更新当前登录用户的指定项目详情；校验 Authorization 令牌并使用 service_role 访问数据库；仅返回本页所需字段
// 额外：PATCH 支持推进项目阶段（action=advance），服务端计算下一状态并更新 status/prev_status/updated_at
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnvVars } from '@/lib/env';

export const runtime = 'edge';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/projects/me/[id] - 获取我的项目详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { supabaseUrl, serviceRoleKey } = getEnvVars();

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: '服务端环境变量未配置' }, { status: 500 });
    }

    // 解析并校验认证头
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: '缺少认证令牌，请先登录' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // 验证 token 并获取用户信息
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    const userId = authData?.user?.id || '';
    if (authErr || !userId) {
      return NextResponse.json({ error: '认证令牌无效，请重新登录' }, { status: 401 });
    }

    // 查询项目详情，确保是当前用户的项目
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        updated_at,
        developer_id,
        creative_id,
        creatives(
          id,
          title,
          description,
          author_id
        )
      `)
      .eq('id', id)
      .eq('developer_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '项目不存在' }, { status: 404 });
      }
      console.error('获取项目详情失败:', error);
      return NextResponse.json({ error: '获取项目详情失败' }, { status: 500 });
    }

    // 为了兼容前端，添加 title 字段
    const projectWithTitle = {
      ...project,
      title: project.name // 将 name 字段复制为 title
    };

    return NextResponse.json({ project: projectWithTitle });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// PUT /api/projects/me/[id] - 更新我的项目信息
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { supabaseUrl, serviceRoleKey } = getEnvVars();

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: '服务端环境变量未配置' }, { status: 500 });
    }

    // 解析并校验认证头
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: '缺少认证令牌，请先登录' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // 验证 token 并获取用户信息
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    const userId = authData?.user?.id || '';
    if (authErr || !userId) {
      return NextResponse.json({ error: '认证令牌无效，请重新登录' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();
    const { name, title, description } = body;
    
    // 支持 title 或 name 字段
    const projectName = title || name;

    // 验证输入
    if (!projectName || projectName.trim().length === 0) {
      return NextResponse.json({ error: '项目名称不能为空' }, { status: 400 });
    }

    if (projectName.trim().length > 100) {
      return NextResponse.json({ error: '项目名称不能超过100个字符' }, { status: 400 });
    }

    if (description && description.length > 1000) {
      return NextResponse.json({ error: '项目描述不能超过1000个字符' }, { status: 400 });
    }

    // 更新项目信息，确保是当前用户的项目
    const { data: project, error } = await supabase
      .from('projects')
      .update({
        name: projectName.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('developer_id', userId)
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        updated_at,
        developer_id,
        creative_id
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '项目不存在或无权限修改' }, { status: 404 });
      }
      console.error('更新项目失败:', error);
      return NextResponse.json({ error: '更新项目失败' }, { status: 500 });
    }

    // 为了兼容前端，添加 title 字段
    const projectWithTitle = {
      ...project,
      title: project.name // 将 name 字段复制为 title
    };

    return NextResponse.json({ project: projectWithTitle });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// PATCH /api/projects/me/[id] - 推进项目阶段
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { supabaseUrl, serviceRoleKey } = getEnvVars();

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: '服务端环境变量未配置' }, { status: 500 });
    }

    // 解析并校验认证头
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: '缺少认证令牌，请先登录' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 验证 token 并获取用户信息
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    const userId = authData?.user?.id || '';
    if (authErr || !userId) {
      return NextResponse.json({ error: '认证令牌无效，请重新登录' }, { status: 401 });
    }

    // 校验 action
    type Action = 'advance';
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const action = (body as { action?: string })?.action as Action | undefined;
    if (action !== 'advance') {
      return NextResponse.json({ error: '不支持的操作' }, { status: 400 });
    }

    // 查询当前项目，确保属于当前用户
    const { data: current, error: fetchErr } = await supabase
      .from('projects')
      .select('id, name, description, status, created_at, updated_at, developer_id, creative_id')
      .eq('id', id)
      .eq('developer_id', userId)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        return NextResponse.json({ error: '项目不存在或无权限' }, { status: 404 });
      }
      console.error('查询项目失败:', fetchErr);
      return NextResponse.json({ error: '查询项目失败' }, { status: 500 });
    }

    const prevStatus = (current.status as string) || 'planning';
    // 计算下一状态
    const nextMap: Record<string, 'planning' | 'developing' | 'internalTesting' | 'released'> = {
      planning: 'developing',
      developing: 'internalTesting',
      internalTesting: 'released',
      released: 'released',
    };
    const nextStatus = nextMap[prevStatus] || 'planning';

    if (prevStatus === 'released') {
      return NextResponse.json({ error: '已发布的项目无法继续推进' }, { status: 400 });
    }

    // 执行更新（乐观并发控制：要求当前状态等于 prevStatus）
    const { data: updated, error: updateErr } = await supabase
      .from('projects')
      .update({
        status: nextStatus,
        prev_status: prevStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('developer_id', userId)
      .eq('status', prevStatus)
      .select('id, name, description, status, created_at, updated_at, developer_id, creative_id')
      .single();

    if (updateErr) {
      if (updateErr.code === 'PGRST116') {
        // 可能是并发导致状态已改变
        return NextResponse.json({ error: '状态已变更，请刷新后重试' }, { status: 409 });
      }
      console.error('推进阶段失败:', updateErr);
      return NextResponse.json({ error: '推进阶段失败' }, { status: 500 });
    }

    const projectWithTitle = {
      ...updated,
      title: updated.name,
    };

    return NextResponse.json({ project: projectWithTitle });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}