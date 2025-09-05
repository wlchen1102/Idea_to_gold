-- 获取用户支持的创意列表的数据库函数（简化高效版本）
-- 功能：获取指定用户点赞过的创意，复用现有创意列表的统计逻辑
-- 设计思路：creative_upvotes表记录用户点赞行为，只需简单筛选即可
-- 作者：AI Assistant
-- 创建时间：2024

-- 删除现有函数（如果存在）
DROP FUNCTION IF EXISTS get_user_supported_creatives(UUID, INTEGER, INTEGER);

-- 创建简化高效的函数
CREATE OR REPLACE FUNCTION get_user_supported_creatives(
  user_id UUID,
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
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
  profiles JSONB,
  upvoted_at TIMESTAMPTZ
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
    ) as profiles,
    cu.created_at as upvoted_at
  FROM 
    public.creative_upvotes cu
  INNER JOIN 
    public.creatives c ON cu.creative_id = c.id
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
    cu.user_id = get_user_supported_creatives.user_id
    AND c.deleted_at IS NULL
  ORDER BY 
    cu.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- 为函数添加注释
COMMENT ON FUNCTION get_user_supported_creatives(UUID, INTEGER, INTEGER) IS '获取指定用户支持的创意列表，简化版本，复用现有统计逻辑，性能优化';

-- 确保相关索引存在以优化查询性能
CREATE INDEX IF NOT EXISTS idx_creative_upvotes_user_created 
  ON public.creative_upvotes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_id 
  ON public.creative_upvotes (creative_id);

CREATE INDEX IF NOT EXISTS idx_comments_creative_id 
  ON public.comments (creative_id) 
  WHERE creative_id IS NOT NULL;

-- 验证函数创建成功
SELECT 'get_user_supported_creatives 简化版本创建成功' as status;