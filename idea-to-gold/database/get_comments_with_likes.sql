-- 创建存储过程：一次性获取评论、作者信息和点赞统计
-- 这个存储过程将替代原有的多次数据库查询，提高性能

CREATE OR REPLACE FUNCTION get_comments_with_likes(
  p_creative_id UUID,
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  author_id UUID,
  creative_id UUID,
  project_log_id UUID,
  parent_comment_id UUID,
  created_at TIMESTAMPTZ,
  nickname TEXT,
  avatar_url TEXT,
  likes_count BIGINT,
  current_user_liked BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.author_id,
    c.creative_id,
    c.project_log_id,
    c.parent_comment_id,
    c.created_at,
    p.nickname,
    p.avatar_url,
    COALESCE(like_stats.likes_count, 0) AS likes_count,
    COALESCE(user_likes.current_user_liked, FALSE) AS current_user_liked
  FROM comments c
  LEFT JOIN profiles p ON c.author_id = p.id
  LEFT JOIN (
    -- 子查询：统计每个评论的点赞总数
    SELECT 
      cl.comment_id,
      COUNT(*) AS likes_count
    FROM comment_likes cl
    GROUP BY cl.comment_id
  ) like_stats ON c.id = like_stats.comment_id
  LEFT JOIN (
    -- 子查询：检查当前用户是否点赞了每个评论
    SELECT 
      cl.comment_id,
      TRUE AS current_user_liked
    FROM comment_likes cl
    WHERE cl.user_id = p_user_id
  ) user_likes ON c.id = user_likes.comment_id
  WHERE c.creative_id = p_creative_id
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 为存储过程添加注释
COMMENT ON FUNCTION get_comments_with_likes(UUID, UUID, INTEGER, INTEGER) IS 
'获取指定创意下的评论列表，包含作者信息、点赞统计和当前用户点赞状态。优化版本，减少数据库往返次数。';

-- 创建索引以优化存储过程性能（如果不存在的话）
-- 这些索引应该已经在表结构文档中定义，这里仅作为确保
CREATE INDEX IF NOT EXISTS idx_comments_creative_created_desc 
  ON comments (creative_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user 
  ON comment_likes (comment_id, user_id);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id 
  ON comment_likes (comment_id);

-- 验证存储过程是否创建成功的测试查询（可选）
-- SELECT * FROM get_comments_with_likes(
--   '1802b57e-96a6-4552-8644-63799e0e2837'::UUID, 
--   '00000000-0000-0000-0000-000000000000'::UUID, 
--   10, 
--   0
-- );