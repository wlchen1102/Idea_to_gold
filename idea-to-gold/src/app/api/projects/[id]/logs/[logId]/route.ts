// 项目动态API路由 - 删除指定动态（Edge Runtime）
// 功能：删除指定项目的某条动态日志；仅作者本人可删除；使用 Supabase 服务端权限执行硬删除
export const runtime = 'edge'

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnvVars } from '@/lib/env';

// 删除项目动态
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; logId: string }> }) {
  try {
    const awaitedParams = await params;
    const projectId = awaitedParams.id;
    const logId = awaitedParams.logId;

    // 从请求头获取 JWT 令牌
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供有效的认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 读取环境变量（统一兼容本地与 Cloudflare Pages）
    let supabaseUrl: string;
    let anonKey: string;
    let serviceRoleKey: string;
    try {
      const env = getEnvVars();
      supabaseUrl = env.supabaseUrl;
      anonKey = env.anonKey;
      serviceRoleKey = env.serviceRoleKey;
    } catch (e) {
      console.error('环境变量缺失或读取失败:', e);
      return NextResponse.json({ error: '服务器配置错误' }, { status: 500 });
    }

    // 使用 GoTrue 远端校验用户令牌，避免在 Edge 环境本地校验 JWT 导致兼容性问题
    const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    const userId = authData.user.id;

    // 使用 service_role 执行数据库操作（绕过 RLS）
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 验证动态是否存在
    const { data: log, error: logError } = await supabaseAdmin
      .from('project_logs')
      .select('id, author_id, project_id')
      .eq('id', logId)
      .eq('project_id', projectId)
      .single();

    if (logError || !log) {
      return NextResponse.json(
        { error: '动态不存在' },
        { status: 404 }
      );
    }

    // 检查用户权限：只有动态作者可以删除自己的动态
    if (log.author_id !== userId) {
      return NextResponse.json(
        { error: '只能删除自己发布的动态' },
        { status: 403 }
      );
    }

    // 删除动态（硬删除）
    const { error: deleteError } = await supabaseAdmin
      .from('project_logs')
      .delete()
      .eq('id', logId)
      .eq('author_id', userId); // 双重验证，确保安全

    if (deleteError) {
      console.error('删除动态失败:', deleteError);
      return NextResponse.json(
        { error: '删除动态失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: '动态删除成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}