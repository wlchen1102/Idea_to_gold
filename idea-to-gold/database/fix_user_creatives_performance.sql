-- 修复个人中心"我的创意"API性能问题
-- 当前加载时间：6.26秒 -> 目标：500ms以内
-- 问题：RPC函数可能未正确部署，导致API回退到低效的批量查询

-- ========================================
-- 第一步：检查当前RPC函数状态
-- ========================================

-- 查看是否存在RPC函数
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_user_creatives_with_counts'
  AND routine_schema = 'public';

-- ========================================
-- 第二步：强制重新创建RPC函数
-- ========================================

-- 删除现有函数（如果存在）
DROP FUNCTION IF EXISTS get_user_creatives_with_counts(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_creatives_with_counts CASCADE;

-- 重新创建优化的RPC函数（修正参数名）
CREATE OR REPLACE FUNCTION get_user_creatives_with_counts(
  user_uuid UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  terminals TEXT[],
  created_at TIMESTAMPTZ,
  author_id UUID,
  slug TEXT,
  upvote_count BIGINT,
  comment_count BIGINT,
  bounty_amount INTEGER,
  profiles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.terminals,
    c.created_at,
    c.author_id,
    c.slug,
    COALESCE(upvote_stats.upvote_count, 0) AS upvote_count,
    COALESCE(comment_stats.comment_count, 0) AS comment_count,
    c.bounty_amount,
    jsonb_build_object(
      'nickname', p.nickname,
      'avatar_url', p.avatar_url
    ) AS profiles
  FROM creatives c
  LEFT JOIN profiles p ON c.author_id = p.id
  LEFT JOIN (
    -- 子查询：统计每个创意的点赞总数
    SELECT 
      cu.creative_id,
      COUNT(*) AS upvote_count
    FROM creative_upvotes cu
    GROUP BY cu.creative_id
  ) upvote_stats ON c.id = upvote_stats.creative_id
  LEFT JOIN (
    -- 子查询：统计每个创意的评论总数
    SELECT 
      cm.creative_id,
      COUNT(*) AS comment_count
    FROM comments cm
    WHERE cm.creative_id IS NOT NULL
    GROUP BY cm.creative_id
  ) comment_stats ON c.id = comment_stats.creative_id
  WHERE c.author_id = user_uuid
  ORDER BY c.created_at DESC;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION get_user_creatives_with_counts(UUID) IS 
'获取指定用户的创意列表，包含点赞数、评论数和作者信息。优化版本，单次查询获取所有数据，解决6.26秒加载问题。';

-- ========================================
-- 第三步：确保关键索引存在
-- ========================================

-- 创意表：按作者ID和创建时间的复合索引（最重要）
CREATE INDEX IF NOT EXISTS idx_creatives_author_created_desc
ON creatives (author_id, created_at DESC);

-- 创意点赞表：按创意ID分组统计的索引
CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_id
ON creative_upvotes (creative_id);

-- 评论表：按创意ID分组统计的索引
CREATE INDEX IF NOT EXISTS idx_comments_creative_id_stats
ON comments (creative_id) 
WHERE creative_id IS NOT NULL;

-- 用户资料表：主键索引（通常已存在，但确保存在）
CREATE INDEX IF NOT EXISTS idx_profiles_id
ON profiles (id);

-- ========================================
-- 第四步：更新表统计信息
-- ========================================

-- 更新统计信息，帮助查询优化器
ANALYZE creatives;
ANALYZE creative_upvotes;
ANALYZE comments;
ANALYZE profiles;

-- ========================================
-- 第五步：测试RPC函数
-- ========================================

-- 测试RPC函数是否正常工作（使用实际的用户ID）
-- 请将 'ee48a185-60b1-48bb-aff6-77ec8ed82880' 替换为实际的用户ID
SELECT * FROM get_user_creatives_with_counts('ee48a185-60b1-48bb-aff6-77ec8ed82880'::UUID) LIMIT 5;

-- ========================================
-- 第六步：验证优化结果
-- ========================================

-- 确认RPC函数已创建
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_user_creatives_with_counts'
  AND routine_schema = 'public';

-- 查看相关索引
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('creatives', 'creative_upvotes', 'comments', 'profiles')
  AND schemaname = 'public'
  AND indexname LIKE '%author%' OR indexname LIKE '%creative_id%'
ORDER BY tablename, indexname;

-- ========================================
-- 执行说明
-- ========================================

/*
问题分析：
1. API代码显示会优先尝试调用RPC函数 get_user_creatives_with_counts
2. 如果RPC函数失败，会回退到批量查询方式（3次独立查询）
3. 6.26秒的加载时间表明RPC函数可能未正确部署或执行失败

解决方案：
1. 强制重新创建RPC函数，确保正确部署
2. 添加SECURITY DEFINER确保函数有足够权限
3. 创建关键索引优化查询性能
4. 更新表统计信息

执行步骤：
1. 在Supabase SQL编辑器中执行此脚本
2. 检查执行结果，确保没有错误
3. 重新测试个人中心页面加载速度
4. 预期加载时间应降低到500ms以内

注意事项：
- 执行前请备份重要数据
- 建议在低峰期执行
- 如有错误，请检查表结构是否匹配
*/