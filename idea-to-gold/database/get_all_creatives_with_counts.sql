-- 创建优化的RPC函数，一次性获取所有创意及其统计数据
-- 这个函数使用JOIN和聚合查询来避免N+1查询问题，适用于创意广场

CREATE OR REPLACE FUNCTION get_all_creatives_with_counts(
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
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
    c.deleted_at IS NULL  -- 只获取未删除的创意
  ORDER BY 
    c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- 为函数添加注释
COMMENT ON FUNCTION get_all_creatives_with_counts(INTEGER, INTEGER) IS '获取所有创意及其点赞数和评论数，支持分页，使用单个查询优化性能';

-- 确保相关索引存在以优化查询性能
CREATE INDEX IF NOT EXISTS idx_creatives_created_desc 
  ON public.creatives (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_id 
  ON public.creative_upvotes (creative_id);

CREATE INDEX IF NOT EXISTS idx_comments_creative_id 
  ON public.comments (creative_id) 
  WHERE creative_id IS NOT NULL;

-- 为了支持热门排序，创建一个按点赞数排序的函数
CREATE OR REPLACE FUNCTION get_popular_creatives_with_counts(
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
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
    c.deleted_at IS NULL  -- 只获取未删除的创意
  ORDER BY 
    COALESCE(upvotes.upvote_count, 0) DESC,
    c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- 为热门排序函数添加注释
COMMENT ON FUNCTION get_popular_creatives_with_counts(INTEGER, INTEGER) IS '获取按点赞数排序的热门创意及其统计数据，支持分页，使用单个查询优化性能';