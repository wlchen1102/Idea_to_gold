// 获取用户发布的创意列表API
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getAuthEnvVars, getAdminEnvVars } from '@/lib/env';

// 验证JWT令牌并获取用户信息
async function verifyToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { supabaseUrl, anonKey } = getAuthEnvVars();

  const supabase = createClient(supabaseUrl, anonKey);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

// 获取用户发布的创意列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const authHeader = request.headers.get('Authorization');
    
    // 验证用户身份
    const user = await verifyToken(authHeader);
    if (!user) {
      return NextResponse.json(
        { message: '未授权' },
        { status: 401 }
      );
    }

    // 检查是否是用户本人或有权限查看
    if (user.id !== userId) {
      // 这里可以添加更复杂的权限检查逻辑
      // 目前允许查看其他用户的公开创意
    }

    const { supabaseUrl, serviceRoleKey } = getAdminEnvVars();

    // 使用service_role密钥创建客户端
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // 获取用户发布的创意列表
    const { data: creatives, error } = await supabase
      .from('creatives')
      .select(`
        id,
        title,
        description,
        terminals,
        created_at,
        author_id,
        slug,
        upvote_count,
        comment_count,
        bounty_amount,
        profiles!creatives_author_id_fkey (
          nickname,
          avatar_url
        )
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取创意列表失败:', error);
      return NextResponse.json(
        { message: '获取创意列表失败', error: error.message },
        { status: 500 }
      );
    }

    // 获取每个创意的点赞数和评论数
    const creativesWithStats = await Promise.all(
      (creatives || []).map(async (creative) => {
        // 获取点赞数
        const { count: upvoteCount } = await supabase
          .from('creative_upvotes')
          .select('*', { count: 'exact', head: true })
          .eq('creative_id', creative.id);

        // 获取评论数
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('creative_id', creative.id);

        return {
          ...creative,
          upvote_count: upvoteCount || 0,
          comment_count: commentCount || 0
        };
      })
    );

    return NextResponse.json({
      creatives: creativesWithStats,
      total: creativesWithStats.length
    });

  } catch (error) {
    console.error('获取用户创意列表异常:', error);
    return NextResponse.json(
      { 
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}