-- 为 comment_likes 表添加评论内容字段
-- 功能：在点赞记录中直接存储评论内容，方便查看点赞的具体评论
-- 注意：开发环境使用，不考虑历史数据同步

-- 1. 添加评论内容字段
ALTER TABLE public.comment_likes 
ADD COLUMN comment_content TEXT;

-- 2. 添加字段注释
COMMENT ON COLUMN public.comment_likes.comment_content IS '被点赞评论的内容快照，方便查看点赞记录';

-- 3. 验证表结构
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'comment_likes' 
-- ORDER BY ordinal_position;