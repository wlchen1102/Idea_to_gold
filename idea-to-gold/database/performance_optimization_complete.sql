-- 个人中心我的创意页面性能优化完整SQL脚本
-- 执行此脚本以实现1秒内加载目标
-- 请在Supabase SQL编辑器中执行

-- ========================================
-- 第一部分：创建优化的RPC函数
-- ========================================

-- 先删除现有函数（如果存在）
-- 使用CASCADE强制删除，忽略依赖关系
DROP FUNCTION IF EXISTS get_user_creatives_with_counts CASCADE;
DROP FUNCTION IF EXISTS get_user_creatives_with_counts(UUID) CASCADE;

-- 创建获取用户创意及统计数据的RPC函数
CREATE FUNCTION get_user_creatives_with_counts(
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
  bounty_amount NUMERIC,
  profiles JSONB
)
LANGUAGE plpgsql
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

-- 为RPC函数添加注释
COMMENT ON FUNCTION get_user_creatives_with_counts(UUID) IS 
'获取指定用户的创意列表，包含点赞数、评论数和作者信息。优化版本，一次查询获取所有数据。';

-- ========================================
-- 第二部分：创建性能优化索引
-- ========================================

-- 1. 创意表：按作者ID和创建时间的复合索引
CREATE INDEX IF NOT EXISTS idx_creatives_author_created_desc
ON creatives (author_id, created_at DESC);

-- 2. 创意点赞表：按创意ID分组统计的索引
CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_id
ON creative_upvotes (creative_id);

-- 3. 创意点赞表：用户点赞查询的复合索引
CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_user
ON creative_upvotes (creative_id, user_id);

-- 4. 评论表：按创意ID分组统计的索引
CREATE INDEX IF NOT EXISTS idx_comments_creative_id_stats
ON comments (creative_id) 
WHERE creative_id IS NOT NULL;

-- 5. 评论表：按创意ID和创建时间的复合索引
CREATE INDEX IF NOT EXISTS idx_comments_creative_created_desc
ON comments (creative_id, created_at DESC)
WHERE creative_id IS NOT NULL;

-- 6. 用户资料表：昵称查询索引
CREATE INDEX IF NOT EXISTS idx_profiles_nickname
ON profiles (nickname)
WHERE nickname IS NOT NULL;

-- 7. 用户资料表：头像URL索引（用于头像加载优化）
CREATE INDEX IF NOT EXISTS idx_profiles_avatar
ON profiles (avatar_url)
WHERE avatar_url IS NOT NULL;

-- ========================================
-- 第三部分：评论系统相关索引（如果需要）
-- ========================================

-- 评论点赞表：按评论ID分组统计
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id
ON comment_likes (comment_id);

-- 评论点赞表：用户点赞查询的复合索引
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user
ON comment_likes (comment_id, user_id);

-- 评论表：按作者ID和创建时间的索引
CREATE INDEX IF NOT EXISTS idx_comments_author_created_desc
ON comments (author_id, created_at DESC);

-- 评论表：父评论查询索引
CREATE INDEX IF NOT EXISTS idx_comments_parent
ON comments (parent_comment_id)
WHERE parent_comment_id IS NOT NULL;

-- ========================================
-- 第四部分：更新统计信息
-- ========================================

-- 更新表统计信息，帮助查询优化器生成更好的执行计划
ANALYZE creatives;
ANALYZE creative_upvotes;
ANALYZE comments;
ANALYZE comment_likes;
ANALYZE profiles;

-- ========================================
-- 第五部分：验证优化结果
-- ========================================

-- 查看创建的索引
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('creatives', 'creative_upvotes', 'comments', 'comment_likes', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 验证RPC函数是否创建成功
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_user_creatives_with_counts'
  AND routine_schema = 'public';

-- ========================================
-- 执行说明
-- ========================================

/*
执行步骤：
1. 复制整个SQL脚本
2. 在Supabase项目的SQL编辑器中粘贴
3. 点击"Run"执行
4. 检查执行结果，确保没有错误
5. 重新测试个人中心页面的加载速度

预期效果：
- API响应时间从2秒降低到500ms以内
- 页面总加载时间控制在1秒以内
- 数据库查询次数从3次减少到1次
- 显著提升用户体验

注意事项：
- 如果某些索引已存在，会自动跳过
- RPC函数会覆盖同名的旧版本
- 执行过程中可能需要几秒钟时间
- 建议在低峰期执行以减少对生产环境的影响
*/