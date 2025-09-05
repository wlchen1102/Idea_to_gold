-- 测试版本的用户支持创意函数
-- 用于排查字段类型匹配问题

-- 删除测试函数（如果存在）
DROP FUNCTION IF EXISTS test_user_supported_creatives(UUID, INTEGER, INTEGER);

-- 创建简化的测试函数
CREATE OR REPLACE FUNCTION test_user_supported_creatives(
  user_id UUID,
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  author_id UUID,
  created_at TIMESTAMPTZ,
  upvoted_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH total_records AS (
    SELECT COUNT(*)::BIGINT as total_count
    FROM public.creative_upvotes cu
    INNER JOIN public.creatives c ON cu.creative_id = c.id
    WHERE cu.user_id = test_user_supported_creatives.user_id
      AND c.deleted_at IS NULL
  )
  SELECT 
    c.id,
    c.title,
    c.description,
    c.author_id,
    c.created_at,
    cu.created_at as upvoted_at,
    tr.total_count
  FROM public.creative_upvotes cu
  INNER JOIN public.creatives c ON cu.creative_id = c.id
  CROSS JOIN total_records tr
  WHERE cu.user_id = test_user_supported_creatives.user_id
    AND c.deleted_at IS NULL
  ORDER BY cu.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- 测试函数
SELECT 'test_user_supported_creatives 函数创建成功' as status;