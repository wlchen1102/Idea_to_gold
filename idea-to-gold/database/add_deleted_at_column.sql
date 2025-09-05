-- 为creatives表添加deleted_at字段以支持软删除功能
-- 执行此SQL以修复删除创意功能

-- 添加deleted_at字段
ALTER TABLE public.creatives 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 添加注释说明字段用途
COMMENT ON COLUMN public.creatives.deleted_at IS '软删除时间戳，NULL表示未删除，有值表示已删除';

-- 创建索引以优化查询性能（查询未删除的创意）
CREATE INDEX IF NOT EXISTS idx_creatives_deleted_at 
ON public.creatives (deleted_at) 
WHERE deleted_at IS NULL;

-- 更新现有的查询函数，过滤已删除的创意
-- 修改get_all_creatives_with_counts函数
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
    c.deleted_at IS NULL  -- 只返回未删除的创意
  ORDER BY 
    c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- 修改get_user_creatives_with_counts函数
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
    AND c.deleted_at IS NULL  -- 只返回未删除的创意
  ORDER BY 
    c.created_at DESC;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION get_all_creatives_with_counts(INTEGER, INTEGER) IS '获取所有未删除的创意及其点赞数和评论数，支持分页';
COMMENT ON FUNCTION get_user_creatives_with_counts(UUID) IS '获取指定用户的未删除创意列表，包含点赞数、评论数和作者信息';

-- 验证字段是否添加成功
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'creatives' 
AND table_schema = 'public' 
AND column_name = 'deleted_at';