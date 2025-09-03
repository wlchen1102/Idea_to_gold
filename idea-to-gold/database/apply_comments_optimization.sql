-- 评论查询性能优化 SQL 脚本
-- 此脚本将创建必要的索引和存储过程来大幅提升评论查询性能
-- 执行前请确保有数据库管理权限

-- 1. 创建 comments 表的优化索引
-- 创意相关评论的查询索引（creative_id + 创建时间）
CREATE INDEX IF NOT EXISTS idx_comments_creative_time 
ON comments(creative_id, created_at) 
WHERE creative_id IS NOT NULL;

-- 项目相关评论的查询索引（project_id + project_log_id + 创建时间）
CREATE INDEX IF NOT EXISTS idx_comments_project_log_time 
ON comments(project_id, project_log_id, created_at) 
WHERE project_id IS NOT NULL;

-- 项目评论的查询索引（project_id + 创建时间，仅项目级评论）
CREATE INDEX IF NOT EXISTS idx_comments_project_only_time 
ON comments(project_id, created_at) 
WHERE project_id IS NOT NULL AND project_log_id IS NULL;

-- 作者ID索引（用于JOIN profiles表）
CREATE INDEX IF NOT EXISTS idx_comments_author_id 
ON comments(author_id);

-- 2. 创建 comment_likes 表的优化索引
-- 评论点赞统计索引（comment_id）
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id 
ON comment_likes(comment_id);

-- 用户点赞查询索引（user_id + comment_id）
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment 
ON comment_likes(user_id, comment_id);

-- 点赞统计专用索引（comment_id, user_id）- 用于快速聚合
CREATE INDEX IF NOT EXISTS idx_comment_likes_count_aggregate 
ON comment_likes(comment_id, user_id);

-- 3. 创建 profiles 表的优化索引（如果不存在）
-- 用户昵称查询索引
CREATE INDEX IF NOT EXISTS idx_profiles_nickname 
ON profiles(nickname);

-- 用户头像查询索引
CREATE INDEX IF NOT EXISTS idx_profiles_avatar 
ON profiles(avatar_url);

-- 4. 创建或替换高性能的评论查询存储过程
-- 变更点：
-- - 将 profiles 的 INNER JOIN 改为 LEFT JOIN，避免因缺少资料而过滤掉评论
-- - 将排序由 c.created_at ASC 改为 DESC，确保最新评论/回复优先返回，解决乐观更新后“回复消失”问题
CREATE OR REPLACE FUNCTION get_comments_with_likes(
    p_creative_id uuid DEFAULT NULL,
    p_project_id uuid DEFAULT NULL,
    p_project_log_id uuid DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
) RETURNS TABLE(
    id uuid,
    content text,
    author_id uuid,
    creative_id uuid,
    project_id uuid,
    project_log_id uuid,
    parent_comment_id uuid,
    created_at timestamptz,
    nickname text,
    avatar_url text,
    likes_count bigint,
    current_user_liked boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.author_id,
        c.creative_id,
        c.project_id,
        c.project_log_id,
        c.parent_comment_id,
        c.created_at,
        p.nickname,
        p.avatar_url,
        COALESCE(like_stats.likes_count, 0) as likes_count,
        COALESCE(user_likes.liked, false) as current_user_liked
    FROM comments c
    -- 关键修复：允许没有 profiles 资料的用户评论也能被返回
    LEFT JOIN profiles p ON c.author_id = p.id
    LEFT JOIN (
        -- 点赞统计子查询
        SELECT 
            cl.comment_id,
            COUNT(*) as likes_count
        FROM comment_likes cl
        GROUP BY cl.comment_id
    ) like_stats ON c.id = like_stats.comment_id
    LEFT JOIN (
        -- 当前用户点赞状态子查询
        SELECT 
            cl.comment_id,
            true as liked
        FROM comment_likes cl
        WHERE cl.user_id = p_user_id AND p_user_id IS NOT NULL
    ) user_likes ON c.id = user_likes.comment_id
    WHERE 
        -- 动态查询条件
        (p_creative_id IS NULL OR c.creative_id = p_creative_id)
        AND (
            -- 项目相关评论的复杂逻辑
            p_project_id IS NULL 
            OR (
                p_project_log_id IS NOT NULL 
                AND c.project_id = p_project_id 
                AND c.project_log_id = p_project_log_id
            )
            OR (
                p_project_log_id IS NULL 
                AND c.project_id = p_project_id 
                AND c.project_log_id IS NULL
            )
        )
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 5. 更新表统计信息以优化查询计划
ANALYZE comments;
ANALYZE comment_likes;
ANALYZE profiles;

-- 6. 验证索引创建结果
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('comments', 'comment_likes', 'profiles')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 7. 显示存储过程信息
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_comments_with_likes';

-- 优化完成提示
SELECT 'Comments performance optimization completed successfully!' as status;