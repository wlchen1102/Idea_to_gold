// 获取用户发布的创意列表API
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
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
    
    // 尝试使用RPC函数一次性获取创意及其统计数据
    const { data: creativesWithStats, error: rpcError } = await supabase.rpc('get_user_creatives_with_counts', {
      user_uuid: userId
    });

    if (!rpcError && creativesWithStats) {
      const response = NextResponse.json({
        creatives: creativesWithStats,
        total: creativesWithStats.length
      });
      
      // 添加缓存头优化性能
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
      response.headers.set('Content-Type', 'application/json; charset=utf-8');
      
      return response;
    }

    // 如果RPC函数不存在，使用优化的批量查询方式
    console.log('RPC函数不可用，使用优化批量查询方式:', rpcError?.message);
    
    // 使用Promise.all并行执行查询以提升性能
    const [creativesResult, profileResult] = await Promise.all([
      // 获取用户发布的创意列表（不包含JOIN以提升性能）
      supabase
        .from('creatives')
        .select(`
          id,
          title,
          description,
          terminals,
          created_at,
          author_id,
          slug,
          bounty_amount
        `)
        .eq('author_id', userId)
        .is('deleted_at', null)  // 只获取未删除的创意
        .order('created_at', { ascending: false }),
      
      // 并行获取用户资料
      supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('id', userId)
        .single()
    ]);

    const { data: creatives, error } = creativesResult;
    const { data: profile, error: profileError } = profileResult;

    if (error) {
      console.error('获取创意列表失败:', error);
      return NextResponse.json(
        { message: '获取创意列表失败', error: error.message },
        { status: 500 }
      );
    }

    if (profileError) {
      console.error('获取用户资料失败:', profileError);
    }

    if (!creatives || creatives.length === 0) {
      return NextResponse.json({
        creatives: [],
        total: 0
      });
    }

    // 获取所有创意ID
    const creativeIds = creatives.map(c => c.id);

    // 并行获取统计数据
    const [upvoteResult, commentResult] = await Promise.all([
      supabase
        .from('creative_upvotes')
        .select('creative_id')
        .in('creative_id', creativeIds),
      
      supabase
        .from('comments')
        .select('creative_id')
        .in('creative_id', creativeIds)
        .not('creative_id', 'is', null)
    ]);

    const { data: upvoteData, error: upvoteError } = upvoteResult;
    const { data: commentData, error: commentError } = commentResult;

    if (upvoteError || commentError) {
      console.error('获取统计数据失败:', { upvoteError, commentError });
    }

    // 使用对象而非Map提升性能
    const upvoteCounts = {};
    const commentCounts = {};

    // 统计点赞数
    if (upvoteData) {
      upvoteData.forEach(upvote => {
        upvoteCounts[upvote.creative_id] = (upvoteCounts[upvote.creative_id] || 0) + 1;
      });
    }

    // 统计评论数
    if (commentData) {
      commentData.forEach(comment => {
        commentCounts[comment.creative_id] = (commentCounts[comment.creative_id] || 0) + 1;
      });
    }

    // 合并所有数据
    const creativesWithOptimizedStats = creatives.map(creative => ({
      ...creative,
      upvote_count: upvoteCounts[creative.id] || 0,
      comment_count: commentCounts[creative.id] || 0,
      profiles: {
        nickname: profile?.nickname || null,
        avatar_url: profile?.avatar_url || null
      }
    }));

    const response = NextResponse.json({
      creatives: creativesWithOptimizedStats,
      total: creativesWithOptimizedStats.length
    });
    
    // 添加缓存头优化性能
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    
    return response;

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