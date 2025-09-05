// 项目动态API路由 - 获取和新增动态
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnvVars } from '@/lib/env';

export const runtime = 'edge';

// 统一类型定义，供 GET/POST 复用，避免 any
type DbLogRow = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: {
    id?: string | null;
    nickname?: string | null;
    avatar_url?: string | null;
  } | null;
};

// 归一化后返回给前端的结构
type NormalizedLog = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: {
    id: string | null;
    nickname: string | null;
    avatar_url: string | null;
  };
  can_delete: boolean;
};

// 插入后 select 返回的行结构（与 DbLogRow 相同字段集，这里单独命名便于语义化）
type InsertedLogRow = DbLogRow;

// 获取项目动态列表
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    
    // 验证项目ID格式
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: '无效的项目ID' }, { status: 400 });
    }
    
    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars();
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: '服务端环境变量未配置' }, { status: 500 });
    }
    
    // 初始化 Supabase 客户端（使用 service_role 密钥）
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 获取当前用户ID（如果已登录）
    let currentUserId: string | null = null;
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (!authError && userData?.user?.id) {
          currentUserId = userData.user.id;
        }
      }
    } catch (error) {
      // 忽略认证错误，继续获取日志（但不显示删除按钮）
    }

    // 获取项目动态，关联作者信息
    const { data: logs, error } = await supabase
      .from('project_logs')
      .select(`
        id,
        content,
        created_at,
        author_id,
        profiles!project_logs_author_id_fkey (
          id,
          nickname,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取项目动态失败:', error);
      return NextResponse.json(
        { error: '获取项目动态失败' },
        { status: 500 }
      );
    }

    // 使用统一类型归一化数据，添加 can_delete 字段
    const normalizedLogs: NormalizedLog[] = (logs as DbLogRow[]).map((log) => ({
      id: log.id,
      content: log.content,
      created_at: log.created_at,
      author_id: log.author_id,
      author: {
        id: log.profiles?.id ?? null,
        nickname: log.profiles?.nickname ?? null,
        avatar_url: log.profiles?.avatar_url ?? null,
      },
      can_delete: currentUserId ? log.author_id === currentUserId : false,
    }));

    return NextResponse.json({ logs: normalizedLogs });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 新增项目动态
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    
    // 获取环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars();
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: '服务端环境变量未配置' }, { status: 500 });
    }
    
    // 从请求头获取认证令牌
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供有效的认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // 初始化 Supabase 客户端
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // 验证认证令牌并获取用户信息
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user?.id) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    const authorId = userData.user.id;

    // 获取请求体数据
    const { content } = await request.json();
    
    // 验证输入数据
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: '动态内容不能为空' },
        { status: 400 }
      );
    }

    if (content.trim().length > 1000) {
      return NextResponse.json(
        { error: '动态内容不能超过1000个字符' },
        { status: 400 }
      );
    }

    // 验证项目是否存在且用户有权限
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, developer_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    // 检查用户是否是项目开发者（只有项目开发者可以发布动态）
    if (project.developer_id !== authorId) {
      return NextResponse.json(
        { error: '只有项目开发者可以发布动态' },
        { status: 403 }
      );
    }

    // 插入新动态
    const { data: newLog, error: insertError } = await supabase
      .from('project_logs')
      .insert({
        project_id: projectId,
        content: content.trim(),
        author_id: authorId
      })
      .select(`
        id,
        content,
        created_at,
        author_id,
        profiles!project_logs_author_id_fkey (
          id,
          nickname,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error('插入动态失败:', insertError);
      return NextResponse.json(
        { error: '发布动态失败' },
        { status: 500 }
      );
    }

    // 归一化返回结构（严格类型，避免 any）
    const row = newLog as InsertedLogRow;
    const normalizedLog: NormalizedLog = {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      author_id: row.author_id,
      author: {
        id: row.profiles?.id ?? null,
        nickname: row.profiles?.nickname ?? null,
        avatar_url: row.profiles?.avatar_url ?? null,
      },
      can_delete: true,
    };

    return NextResponse.json({ log: normalizedLog }, { status: 201 });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}