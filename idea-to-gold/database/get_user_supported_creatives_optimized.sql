-- 获取用户支持的创意列表的高性能数据库函数
-- 功能：获取指定用户支持的所有创意及其统计信息，支持分页（性能优化版本）
-- 作者：AI Assistant
-- 创建时间：2024
-- 优化说明：消除子查询，使用窗口函数，优化JOIN策略

-- 删除现有函数（如果存在）
DROP FUNCTION IF EXISTS get_user_supported_creatives(UUID, INTEGER, INTEGER);

-- 创建高性能优化版本
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
  bounty_amount NUMERIC,
  author_id UUID,
  created_at TIMESTAMPTZ,
  slug TEXT,
  upvote_count BIGINT,
  comment_count BIGINT,
  profiles JSONB,
  upvoted_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_creatives AS (
    -- 获取用户支持的创意ID列表（分页）
    SELECT 
      cu.creative_id,
      cu.created_at as upvoted_at,
      COUNT(*) OVER() as total_records
    FROM public.creative_upvotes cu
    INNER JOIN public.creatives c ON cu.creative_id = c.id
    WHERE cu.user_id = get_user_supported_creatives.user_id
      AND c.deleted_at IS NULL
    ORDER BY cu.created_at DESC
    LIMIT page_limit
    OFFSET page_offset
  ),
  creative_stats AS (
    -- 批量计算统计数据
    SELECT 
      c.id as creative_id,
      COUNT(DISTINCT cu.user_id) as upvote_count,
      COUNT(DISTINCT cm.id) as comment_count
    FROM public.creatives c
    INNER JOIN user_creatives uc ON c.id = uc.creative_id
    LEFT JOIN public.creative_upvotes cu ON c.id = cu.creative_id
    LEFT JOIN public.comments cm ON c.id = cm.creative_id
    GROUP BY c.id
  )
  SELECT 
    c.id::UUID,
    c.title::TEXT,
    c.description::TEXT,
    c.terminals::TEXT[],
    c.bounty_amount::NUMERIC,
    c.author_id::UUID,
    c.created_at::TIMESTAMPTZ,
    c.slug::TEXT,
    COALESCE(cs.upvote_count, 0)::BIGINT as upvote_count,
    COALESCE(cs.comment_count, 0)::BIGINT as comment_count,
    CASE 
      WHEN p.id IS NOT NULL THEN
        jsonb_build_object(
          'nickname', p.nickname,
          'avatar_url', p.avatar_url
        )
      ELSE NULL::JSONB
    END::JSONB as profiles,
    uc.upvoted_at::TIMESTAMPTZ,
    uc.total_records::BIGINT as total_count
  FROM user_creatives uc
  INNER JOIN public.creatives c ON uc.creative_id = c.id
  LEFT JOIN public.profiles p ON c.author_id = p.id
  LEFT JOIN creative_stats cs ON c.id = cs.creative_id
  ORDER BY uc.upvoted_at DESC;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION get_user_supported_creatives(UUID, INTEGER, INTEGER) IS '获取指定用户支持的所有创意及其点赞数和评论数，支持分页（高性能优化版本）。';

-- 创建高性能索引
-- 复合索引用于用户创意查询
CREATE INDEX IF NOT EXISTS idx_creative_upvotes_user_created_covering 
  ON public.creative_upvotes (user_id, created_at DESC) 
  INCLUDE (creative_id);

-- 创意表的覆盖索引
CREATE INDEX IF NOT EXISTS idx_creatives_covering 
  ON public.creatives (id) 
  INCLUDE (title, description, terminals, bounty_amount, author_id, created_at, slug)
  WHERE deleted_at IS NULL;

-- 用户资料表索引
CREATE INDEX IF NOT EXISTS idx_profiles_covering 
  ON public.profiles (id) 
  INCLUDE (nickname, avatar_url);

-- 点赞统计索引
CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_stats 
  ON public.creative_upvotes (creative_id, user_id);

-- 评论统计索引
CREATE INDEX IF NOT EXISTS idx_comments_creative_stats 
  ON public.comments (creative_id, id) 
  WHERE creative_id IS NOT NULL;

-- 验证函数创建成功
SELECT 'get_user_supported_creatives 高性能版本创建成功' as status;