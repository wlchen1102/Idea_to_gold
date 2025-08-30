-- 评论系统性能优化索引
-- 执行此SQL以优化评论查询性能

-- 1. 创意评论查询的复合索引（按创建时间降序）
-- 用于优化: WHERE creative_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_comments_creative_time 
ON comments (creative_id, created_at DESC) 
WHERE creative_id IS NOT NULL;

-- 2. 评论点赞查询的复合索引
-- 用于优化: WHERE comment_id IN (...) 的点赞统计查询
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user 
ON comment_likes (comment_id, user_id);

-- 3. 用户评论查询索引
-- 用于优化: WHERE author_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_comments_author_time 
ON comments (author_id, created_at DESC);

-- 4. 父评论查询索引（用于回复功能）
-- 用于优化: WHERE parent_comment_id = ?
CREATE INDEX IF NOT EXISTS idx_comments_parent 
ON comments (parent_comment_id) 
WHERE parent_comment_id IS NOT NULL;

-- 5. 项目日志评论查询索引
-- 用于优化: WHERE project_log_id = ?
CREATE INDEX IF NOT EXISTS idx_comments_project_log 
ON comments (project_log_id) 
WHERE project_log_id IS NOT NULL;

-- 6. 评论表的部分索引优化（只索引非空的creative_id）
-- 这可以减少索引大小，提高查询效率
DROP INDEX IF EXISTS idx_comments_creative_id;
CREATE INDEX IF NOT EXISTS idx_comments_creative_id_partial 
ON comments (creative_id) 
WHERE creative_id IS NOT NULL;

-- 7. 用户资料表的昵称索引（用于搜索功能）
CREATE INDEX IF NOT EXISTS idx_profiles_nickname 
ON profiles (nickname) 
WHERE nickname IS NOT NULL;

-- 8. 分析表统计信息（PostgreSQL特有，用于查询优化器）
ANALYZE comments;
ANALYZE comment_likes;
ANALYZE profiles;

-- 查看索引创建结果
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('comments', 'comment_likes', 'profiles')
ORDER BY tablename, indexname;