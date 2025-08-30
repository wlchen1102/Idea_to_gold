-- 创建优化的RPC函数，一次性获取用户创意及其统计数据
-- 这个函数使用JOIN和聚合查询来避免N+1查询问题

-- 先删除现有函数以避免返回类型冲突
DROP FUNCTION IF EXISTS get_user_creatives_with_counts(UUID);

CREATE OR REPLACE FUNCTION get_user_creatives_with_counts(user_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  terminals TEXT[],
  bounty_amount INTEGER,
  author_id UUID,
  created_at TIMESTAMPTZ,
  slug TEXT,
  upvote_count BIGINT,
  comment_count BIGINT,
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
    c.bounty_amount,
    c.author_id,
    c.created_at,
    c.slug,
    COALESCE(upvotes.upvote_count, 0) as upvote_count,
    COALESCE(comments.comment_count, 0) as comment_count,
    jsonb_build_object(
      'id', p.id,
      'nickname', p.nickname,
      'avatar_url', p.avatar_url
    ) as profiles
  FROM 
    public.creatives c
  LEFT JOIN 
    public.profiles p ON c.author_id = p.id
  LEFT JOIN (
    SELECT 
      creative_id,
      COUNT(*) as upvote_count
    FROM 
      public.creative_upvotes
    GROUP BY 
      creative_id
  ) upvotes ON c.id = upvotes.creative_id
  LEFT JOIN (
    SELECT 
      creative_id,
      COUNT(*) as comment_count
    FROM 
      public.comments
    WHERE 
      creative_id IS NOT NULL
    GROUP BY 
      creative_id
  ) comments ON c.id = comments.creative_id
  WHERE 
    c.author_id = user_id
    AND c.deleted_at IS NULL  -- 只获取未删除的创意
  ORDER BY 
    c.created_at DESC;
END;
$$;

-- 为函数添加注释
COMMENT ON FUNCTION get_user_creatives_with_counts(UUID) IS '获取指定用户的所有创意及其点赞数和评论数，使用单个查询优化性能';

-- 确保相关索引存在以优化查询性能
CREATE INDEX IF NOT EXISTS idx_creatives_author_created 
  ON public.creatives (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_id 
  ON public.creative_upvotes (creative_id);

CREATE INDEX IF NOT EXISTS idx_comments_creative_id 
  ON public.comments (creative_id) 
  WHERE creative_id IS NOT NULL;