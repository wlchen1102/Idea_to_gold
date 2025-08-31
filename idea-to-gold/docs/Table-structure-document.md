### **“点子成金”数据库核心表结构文档 (V1.0)**

#### **1. 【核心表】`public.profiles` - 用户公开资料表**

*   **它的作用**:
    *   这张表用来存放所有注册用户的**公开身份信息**。它是我们整个社区系统的“**身份基石**”，与Supabase私有的`auth.users`表通过`id`进行一对一关联。
*   **核心字段**:
    *   `id` (uuid, 主键): 用户的唯一ID，**关联** `auth.users.id`。
    *   `nickname` (text, 唯一): 用户在社区中显示的**唯一昵称**。
    *   `avatar_url` (text): 用户的头像图片链接。
    *   `bio` (text): 用户的个人简介。
    *   `reputation` (int4): 用户的声望分，默认为0。
    *   `updated_at` (timestamptz): 记录最后更新时间。

    表结构如下：
    create table public.profiles (
  id uuid not null,
  nickname text null,
  avatar_url text null,
  bio text null,
  reputation integer not null default 0,
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint profiles_nickname_length check ((char_length(nickname) >= 3))
) TABLESPACE pg_default;

create index IF not exists idx_profiles_nickname on public.profiles using btree (nickname) TABLESPACE pg_default
where
  (nickname is not null);

#### **2. 【核心表】`public.creatives` - 用户创意表**

*   **它的作用**:
    *   这张表用来存放用户发布的所有**原始创意**。它是我们平台**内容生态的核心**。
*   **核心字段**:
    *   `id` (uuid, 主键): 创意自己的唯一ID。
    *   `title` (text): 创意的标题。
    *   `description` (text): 创意的详细描述。
    *   `terminals` (text[]): 期望的产品终端平台，以数组形式存储 (e.g., `{"web", "ios"}` )。
    *   `bounty_amount` (int4): 悬赏金额，默认为0。
    *   `author_id` (uuid, 外键 -> `public.profiles.id`): **指向**发布这个创意的用户的ID。
    *   `created_at` (timestamptz): 创意的发布时间。
    *   `slug` (text, 唯一): 用于生成URL的、对SEO友好的**唯一**字符串。
    *   `upvote_count` (int4, 未来增加): 用于缓存点赞总数，默认为0。

    表结构如下：
    create table public.creatives (
  title text not null,
  description text not null,
  terminals text[] null,
  bounty_amount integer not null default 0,
  author_id uuid not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  id uuid not null default extensions.uuid_generate_v4 (),
  slug text null,
  upvote_count integer not null default 0,
  comment_count integer not null default 0,
  constraint user_creatives_pkey primary key (id),
  constraint user_creatives_slug_key unique (slug),
  constraint creatives_author_id_fkey foreign KEY (author_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

---

#### **3. 【核心表】`public.projects` - 项目表**

*   **它的作用**:
    *   这张表用来存放所有“造物者(开发者)”为了实现某个创意而创建的**具体项目**。它是我们【项目空间】模块的数据基石。
*   **核心字段**:
    *   `id` (uuid, 主键): 项目自己的唯一ID。
    *   `name` (text): 项目名称。
    *   `description` (text): 项目的一句话简介。
    *   `status` (text): 项目的当前阶段，例如 `'planning'`, `'developing'`, `'beta'`, `'published'`。
    *   `developer_id` (uuid, 外键 -> `public.profiles.id`): **指向**开发这个项目的“造物者”的用户ID。
    *   `creative_id` (uuid, 外键 -> `public.creatives.id`): **指向**这个项目所要实现的那个原始“创意”的ID。
    *   `product_info` (jsonb): 当项目最终发布时，用来存储所有产品信息（如截图URL、下载链接、功能介绍等）的JSON字段。
    *   `created_at` (timestamptz): 项目的创建时间。
    *   `updated_at` (timestamptz): 项目的最后更新时间。

表结构如下：
create table public.projects (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  description text not null,
  status text not null default 'planning'::text,
  developer_id uuid not null,
  creative_id uuid not null,
  product_info jsonb null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint projects_pkey primary key (id),
  constraint projects_creative_id_fkey foreign KEY (creative_id) references creatives (id) on delete CASCADE,
  constraint projects_developer_id_fkey foreign KEY (developer_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

#### **4. 【核心表】`public.project_logs` - 项目日志表**

*   **它的作用**:
    *   用来存放“造物者”在【项目主页】发布的每一条“**开发日志**”，形成项目的故事线。
*   **核心字段**:
    *   `id` (uuid, 主键): 日志自己的唯一ID。
    *   `project_id` (uuid, 外键 -> `public.projects.id`): **指向**这条日志属于哪个项目。
    *   `content` (text): 日志的具体内容（支持Markdown）。
    *   `author_id` (uuid, 外键 -> `public.profiles.id`): 发布这条日志的用户ID。
    *   `created_at` (timestamptz): 发布时间。

表结构如下：
create table public.project_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  project_id uuid not null,
  content text not null,
  author_id uuid not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint project_logs_pkey primary key (id),
  constraint project_logs_author_id_fkey foreign KEY (author_id) references profiles (id) on delete CASCADE,
  constraint project_logs_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE
) TABLESPACE pg_default;

#### **5. 【核心表】`public.comments` - 评论/回复表**

*   **它的作用**:
    *   用来存放用户在【创意详情页】或【项目主页】发表的所有**评论和回复**，是社区互动的主要载体。
*   **核心字段**:
    *   `id` (uuid, 主键): 评论自己的唯一ID。
    *   `creative_id` (uuid, 外键 -> `public.creatives.id`, 可为NULL): 指向这条评论是关于哪个创意的。
    *   `project_log_id` (uuid, 外键 -> `public.project_logs.id`, 可为NULL): 指向这条评论是关于哪条开发日志的。
    *   `parent_comment_id` (uuid, 外键 -> `public.comments.id`, 可为NULL): 如果这是一条“回复”，则指向它所回复的那条父评论的ID。
    *   `content` (text): 评论内容。
    *   `author_id` (uuid, 外键 -> `public.profiles.id`): 发表这条评论的用户ID。
    *   `created_at` (timestamptz): 发布时间。

**supabase的执行SQL如下**:
-- ========= CREATE THE comments TABLE =========
-- This table stores all comments and replies for different content types.

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- The "targets" of the comment. At least one should be non-null.
  creative_id uuid REFERENCES public.creatives(id) ON DELETE CASCADE,
  project_log_id uuid REFERENCES public.project_logs(id) ON DELETE CASCADE, -- Assuming project_logs table will exist

  -- For nested replies
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure a comment is linked to at least one thing.
  CONSTRAINT check_comment_target CHECK (creative_id IS NOT NULL OR project_log_id IS NOT NULL) 
);

-- Add comments for clarity
COMMENT ON TABLE public.comments IS 'Stores comments and replies for creatives and project logs.';
COMMENT ON COLUMN public.comments.parent_comment_id IS 'If not NULL, this comment is a reply to another comment.';


-- ========= SET UP ROW LEVEL SECURITY (RLS) FOR comments =========
-- Security rules for the comments system.

-- 1. Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 2. Policy for SELECT: Everyone can read all comments.
CREATE POLICY "Comments are publically viewable."
  ON public.comments FOR SELECT
  USING ( true );

-- 3. Policy for INSERT: Logged-in users can post comments.
CREATE POLICY "Users can insert their own comments."
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = author_id );

-- 4. Policy for UPDATE: Users can only edit their own comments.
CREATE POLICY "Users can update their own comments."
  ON public.comments FOR UPDATE
  USING ( (select auth.uid()) = author_id );

-- 5. Policy for DELETE: Users can only delete their own comments.
CREATE POLICY "Users can delete their own comments."
  ON public.comments FOR DELETE
  USING ( (select auth.uid()) = author_id );

#### **6. 【连接表】`public.creative_upvotes` - 创意点赞记录表**

*   **它的作用**:
    *   以“**多对多**”的方式，记录“**哪个用户，点赞了，哪个创意**”的行为。这是实现防重复点赞、展示用户支持列表等功能的基础。
*   **核心字段**:
    *   `user_id` (uuid, 外键 -> `public.profiles.id`): 点赞用户的ID。
    *   `creative_id` (uuid, 外键 -> `public.creatives.id`): 被点赞的创意的ID。
    *   `created_at` (timestamptz): 点赞时间。
    *   **联合主键**: `PRIMARY KEY (user_id, creative_id)`

**supabase的执行SQL如下**:
-- 01_create_comment_likes.sql

-- 1) 创建表
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

-- 2) 外键（删除评论时，点赞自动级联删除）
alter table public.comment_likes
  add constraint fk_comment_likes_comment
  foreign key (comment_id)
  references public.comments(id)
  on delete cascade;

-- 3) 外键（删除用户时，点赞自动级联清理，或可选择 restrict）
alter table public.comment_likes
  add constraint fk_comment_likes_user
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

-- 4) 唯一约束：同一用户对同一评论只能点赞一次
create unique index if not exists idx_comment_likes_unique
on public.comment_likes (comment_id, user_id);

-- 5) 基于 comment_id 的查询索引（统计聚合和列表附带统计用）
create index if not exists idx_comment_likes_comment_id
on public.comment_likes (comment_id);

-- 可选：基于 user_id 的索引（用户“我点过赞的评论”列表用）
create index if not exists idx_comment_likes_user_id
on public.comment_likes (user_id);

-- 1) 开启行级安全
alter table public.comment_likes enable row level security;

-- 2) 撤销 anon / authenticated 在该表上的所有权限（双保险，配合 RLS 更安全）
revoke all on table public.comment_likes from anon, authenticated;

-- 3) （可选）如果之前给这张表创建过序列/视图等，也一并撤销（通常不需要）
-- 例如：revoke all on sequence public.comment_likes_id_seq from anon, authenticated;

-- 4) 不为 anon/authenticated 创建任何策略，默认即拒绝所有直接访问。
--    后端使用 service_role 调用时将绕过 RLS，所以接口不受影响。


-- 1) 评论表：按创意过滤 + 按时间倒序的复合索引（覆盖常用查询）
CREATE INDEX IF NOT EXISTS idx_comments_creative_created_desc
  ON public.comments (creative_id, created_at DESC);

-- 2) 评论点赞表：按评论ID过滤（同时包含user_id，便于“当前用户是否点赞”的 exists 查询）
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user
  ON public.comment_likes (comment_id, user_id);

-- 3) 创意点赞表：判断“当前用户是否点赞”与写入用
CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_user
  ON public.creative_upvotes (creative_id, user_id);

-- 4) 创意表：确保主键/唯一键在 id 上（通常已有）
-- 如果 creatives.id 不是主键，请确保它已是 PRIMARY KEY 或 UNIQUE 并默认有索引：
-- ALTER TABLE public.creatives ADD PRIMARY KEY (id);

---