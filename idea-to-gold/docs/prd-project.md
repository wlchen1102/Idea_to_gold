# 项目「我的项目」与路由规范（阶段一：仅路由与文档）

## 1. 信息架构与路由规范（App Router + Cloudflare Pages Edge Runtime）

- 统一规范：以 `projects` 为唯一主路径；`project` 仅保留为向后兼容的重定向入口。
- 入口与跳转：
  - 从创意详情页（示例：`/idea/[id]` 的“我来解决”）跳转到创建页面：`/projects/new`。
  - 我的项目（当前登录用户专属视图）：`/projects/me`（新增路由文件）。
  - 项目详情：`/projects/[id]`（本次新增路由文件）。
  - 发布产品：`/projects/[id]/release`（本次新增路由文件）。
  - 产品广场：`/projects`（本次新增路由文件）。

---

# 新增：为什么要做“产品广场”（projects Square）

## 产品广场（projects Square）功能清单（V1）

- 产品卡片列表：名称、Slogan、平台标签（Web/iOS/Android/桌面）、封面图、核心指标（浏览/收藏）。
- 筛选与排序：按平台、状态（规划中/开发中/内测中/已发布）、最新/最热排序。
- 详情页：产品截图、功能亮点、应用链接、原始创意引用、团队成员、开发日志（节选）。
- 互动：收藏、分享、评价（星级+文字）。
- 数据埋点：PV/UV、收藏量、分享点击量。

# 2. 需求澄清与范围（根据最新对齐）

本节在“信息架构/产品广场/接口草案”的基础上，细化关键用户场景与交互规范，作为后续实现依据。

## 2.1 项目创建（从创意发起）

- 入口：创意详情页中的“我来解决”按钮，跳转至 `/projects/new?fromIdeaId={ideaId}`。
- 表单字段（必填）：
  - 项目名称 name（string，1-40 字）
  - 项目简介 intro（string，10-500 字）
  - 初始状态 status（enum：planning | developing）
- 提交后跳转：创建成功后跳转到“项目详情页” `/projects/[id]`（非创意详情页），并在顶部展示一次性提示“项目已创建，可在此更新进展/发布产品”。
- 关联关系：后端保存 from_idea_id，项目详情页展示“源于创意”的引用链接。
- 异常处理：
  - 未登录点击“我来解决”→ 弹出登录引导。
  - 表单校验失败→ 就地校验提示；禁用重复提交。

## 2.2 项目详情页（发布前/发布后双态）

- 路由：`/projects/[id]`（参考现有 UI 实现文件）。
- 发布前（草创/开发期）能力：
  - 项目动态（开发日志）发布：造物者（项目所有者/成员）可发布进展，最新在前。
  - 右侧信息栏：展示项目状态、基础数据（浏览/收藏）与“推进阶段”操作。
  - 新增：暂停项目/恢复项目的操作（详见“状态机”）。
  - 新增：建议反馈入口（建议箱）：任何登录用户可在项目页提交建议，造物者可标记“已采纳/已解决/忽略”。
- 发布后（产品态）能力：
  - Tab 导航示例：产品展示、用户评价、原始创意、开发历史（参照现有 UI）。
  - 支持收藏、分享、评价（星级+文字，后续可接入）。
- 权限与可见性：
  - 开发日志/建议在项目页公开可见；发布动态与处理建议仅限项目成员。

## 2.3 我的项目（头像下拉入口）

- 路由：`/projects/me`（参考现有 UI）。
- 列表内容：展示当前账号的项目卡片与状态，并支持前端筛选（规划中/开发中/内测中/已发布）。
- 允许操作：
  - 编辑项目信息（名称、简介、状态）
  - 删除项目（软删除，需二次确认；不可删除已“已发布”的项目，需先转为“暂停/归档”）
  - 跳转到项目详情进行更多管理

## 2.4 产品广场（只展示已发布）

- 路由：`/projects`。
- 展示范围：仅展示状态为 released 的项目。
- 检索能力：
  - 关键字搜索 `q`
  - 终端筛选 `platform`（web | ios | android | desktop）
  - 排序 `sort`（latest | hottest）
- 卡片信息：名称、Slogan、平台标签、封面、核心指标（浏览/收藏）。

---

# 3. 角色与权限

- 访客：可浏览创意/项目、查看产品广场、查看开发日志与建议列表；不可提交建议/收藏/评价。
- 登录用户：可提交建议、收藏项目、评价（发布后）；可从创意发起项目。
- 造物者（项目所有者/成员）：
  - 发布/删除开发日志
  - 变更项目状态（推进阶段、暂停/恢复）
  - 审核/处理建议（采纳/解决/忽略）
  - 编辑项目信息、删除项目（受状态限制）

---

# 4. 项目状态机与操作

- 状态枚举：
  - planning → developing → internalTesting → released
  - 任意非归档状态可进入 paused（暂停）
  - 可选：archived（归档，终态，仅管理员可恢复）
- 允许的状态流转：
  - 推进：planning → developing → internalTesting → released
  - 暂停：任一进行中（planning/developing/internalTesting/released）→ paused
  - 恢复：paused → 恢复到暂停前的状态
  - 归档：由管理员或项目所有者在无活跃用户影响时执行（可选）
- 约束：
  - released 不允许被“删除”，只能暂停/归档。
  - 删除为软删除（is_deleted=1, deleted_at），仅对“未发布”项目开放。

---

# 5. 交互细节与 UX 约定

- 创建后引导：首次进入项目详情，显示新手引导/关键操作提示（一次性）。
- 日志发布：支持纯文本起步，后续扩展图片/附件；支持撤销/删除（成员权限）。
- 建议箱：
  - 提交表单含标题/正文（必填）、可选标签；提交后就地展示。
  - 列表支持按状态筛选：未处理、已采纳、已解决、已忽略。
  - 造物者可变更状态并追加处理说明。
- 暂停/恢复：
  - 暂停后在项目页明显标记“已暂停”；按钮变为“恢复项目”。
  - 对外只读：暂停时仍可浏览与提交建议，但禁用收藏/评价（可配置）。
- 空态与错误：统一采用轻量提示与引导操作，避免“死路”。

---

# 6. 接口设计（正式版 V1，覆盖“我的项目/项目详情/产品广场/建议箱/发布流程”）

本章重写并细化 API 文档，字段定义与现有表结构一致，必要处提出补充表与字段（附 SQL）。接口实现需符合 Edge Runtime 约束。

- 统一返回规范：
  - 成功：`{ message: string, <resource-key>?: object|array, pagination?: { limit, offset, hasMore, total? } }`
  - 失败：`{ message: string, error?: string }`
  - 与现有评论接口保持一致（字段名与分页结构），参考 <mcfile name="route.ts" path="src/app/api/comments/route.ts"></mcfile>
- 认证：
  - 需要用户身份的接口，前端在请求头添加：`Authorization: Bearer <token>`。
  - 服务端使用 Supabase service_role 在 Edge 侧访问数据库，校验发起人身份与权限。
- 分页：
  - 采用 `limit`（默认20，最大100）+ `offset`，返回 `hasMore`，避免昂贵的 count 查询（total 可选）。
- 时间戳与ID：
  - `id` 为 uuid（字符串）；时间统一使用 `timestamptz` 的 ISO8601 字符串。

## 6.1 资源：项目 Projects

对应表：public.projects（已存在，参照《Table-structure-document.md》）。新增建议字段见 6.6。

- POST /api/projects（创建项目）
  - 权限：登录用户
  - 请求体：
    ```json
    {
      "name": "string(1-40)",
      "description": "string(10-500)",
      "creative_id": "uuid",  
      "status": "planning|developing"  
    }
    ```
  - 字段映射：projects.name/description/status/developer_id(=auth.uid)/creative_id
  - 返回 201：
    ```json
    {
      "message": "创建成功",
      "project": {
        "id": "uuid",
        "name": "...",
        "description": "...",
        "status": "planning",
        "developer_id": "uuid",
        "creative_id": "uuid",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
    }
    ```
  - 失败：400（参数不合法）/401/409（同创意同开发者名重复，可选）/500

- GET /api/projects（产品广场/项目列表）
  - 权限：公开（无 Token 亦可）
  - Query：
    - `q`（string，可选）：模糊匹配 name/description
    - `platform`（enum，可选）：web|ios|android|desktop（优先读取 project.product_info.platforms，若为空可回退到 creative.terminals）
    - `status`（enum，可选）：planning|developing|internalTesting|released（产品广场常用：released）
    - `sort`（enum，可选）：latest|hottest（最新/最热；最热可按 favorites_count 降序）
    - `limit`（默认20，最大50）、`offset`（默认0）
  - 返回 200：
    ```json
    {
      "message": "获取成功",
      "items": [
        {
          "id": "uuid",
          "name": "会议纪要自动化助手",
          "slogan": "释放你的会议生产力",
          "platforms": ["web", "ios"],
          "cover": "https://cdn/cover.jpg",
          "metrics": { "favorites": 12 },
          "status": "released",
          "fromIdea": { "id": "uuid", "title": "AI会议纪要助手" }
        }
      ],
      "pagination": { "limit": 20, "offset": 0, "hasMore": false }
    }
    ```

- GET /api/projects/[id]（项目详情/产品详情）
  - 权限：公开
  - 返回 200：
    ```json
    {
      "message": "获取成功",
      "project": {
        "id": "uuid",
        "name": "会议纪要自动化助手",
        "description": "一句话简介",
        "status": "developing|released|paused|...",
        "developer": { "id": "uuid", "nickname": "Zoe", "avatar_url": "..." },
        "fromIdea": { "id": "uuid", "title": "AI会议纪要助手" },
        "product_info": {
          "slogan": "释放你的会议生产力",
          "platforms": ["web", "ios"],
          "cover_url": "https://.../cover.jpg",
          "screenshots": ["https://.../1.jpg"],
          "features": "富文本/Markdown",
          "links": { "web": "https://...", "ios": "https://appstore..." },
          "release_notes": "发布说明"
        },
        "metrics": { "favorites": 12 }
      }
    }
    ```
  - 404：项目不存在或已软删除

- PATCH /api/projects/[id]（更新项目信息）
  - 权限：项目所有者/成员（最简：所有者）
  - 请求体（任意字段）：`name, description, status`
  - 约束：若 `status` 从 released 变更需校验状态机；暂停/恢复使用专门接口
  - 返回 200：`{ message: "更新成功", project: { ...最新字段... } }`

- POST /api/projects/[id]/publish（发布产品）
  - 权限：项目所有者
  - 请求体：`product_info`（见 6.5 JSON Schema）
  - 作用：校验并写入 `projects.product_info`，同时将 `status` 置为 `released`
  - 返回 200：`{ message: "发布成功", project: { status: "released", product_info: {...} } }`

- POST /api/projects/[id]/pause（暂停）/ POST /api/projects/[id]/resume（恢复）
  - 权限：项目所有者
  - 作用：
    - 暂停：记录 `paused_at`，保存 `prev_status`，并将 `status=paused`
    - 恢复：将 `status=prev_status` 并清理 `prev_status`
  - 返回 200：`{ message: "操作成功", project: { status: "paused"|"<原状态>" } }`

- DELETE /api/projects/[id]（软删除）
  - 权限：项目所有者
  - 约束：released 不可删除（需先暂停/归档）
  - 作用：设置 `is_deleted=true`、`deleted_at=now()`
  - 返回 204（无内容）

## 6.2 资源：项目日志 Project Logs

对应表：public.project_logs（已存在）。

- GET /api/projects/[id]/logs?limit&offset
  - 权限：公开
  - 返回 200：`{ message: "获取成功", logs: [{ id, content, author_id, created_at, author: {nickname, avatar_url} }], pagination }`

- POST /api/projects/[id]/logs
  - 权限：项目所有者/成员
  - 请求体：`{ content: "text(1-5000)" }`
  - 返回 201：`{ message: "发布成功", log: { id, content, created_at } }`

- DELETE /api/projects/[id]/logs/[logId]
  - 权限：日志作者或项目所有者
  - 返回 204

说明：评论沿用通用评论系统，对应 `public.comments`，使用 `project_log_id` 关联到日志。

## 6.3 资源：建议箱 Project Suggestions（新增表）

- GET /api/projects/[id]/suggestions?status&limit&offset
  - 权限：公开
  - Query：`status=open|accepted|resolved|ignored`（默认全部）
  - 返回 200：`{ message: "获取成功", suggestions: [{ id, title, content, status, author: { id, nickname }, created_at, updated_at }], pagination }`

- POST /api/projects/[id]/suggestions
  - 权限：登录用户
  - 请求体：`{ title: "string(1-80)", content: "string(1-2000)" }`
  - 返回 201：`{ message: "提交成功", suggestion: { id, ... } }`

- PATCH /api/projects/[id]/suggestions/[sid]
  - 权限：项目所有者/成员（处理建议）
  - 请求体：`{ status: "accepted|resolved|ignored", handled_note?: "string(0-500)" }`
  - 返回 200：`{ message: "更新成功", suggestion: { ... } }`

## 6.4 资源：收藏 Favorites（项目）

- POST /api/projects/[id]/favorite
  - 权限：登录用户
  - 语义：收藏（幂等，多次调用不报错）
  - 返回 200：`{ message: "已收藏" }`

- DELETE /api/projects/[id]/favorite
  - 权限：登录用户
  - 语义：取消收藏（幂等）
  - 返回 200：`{ message: "已取消收藏" }`

- 补充：我的收藏（可选M2）`GET /api/users/me/favorite-projects?limit&offset`

对应表：`public.project_favorites`（见 6.6）。

## 6.5 资源：评论 Comments（沿用现有接口）

- GET /api/comments?creative_id=uuid&limit&offset
- GET /api/comments?project_log_id=uuid&limit&offset
- POST /api/comments（创建）/ DELETE /api/comments?id=uuid（删除）
- 返回结构、分页字段与现有实现一致，参考 <mcfile name="route.ts" path="src/app/api/comments/route.ts"></mcfile>

## 6.6 资源：评价 Reviews（产品发布后，可选 M2）

- 表（建议）：`public.project_reviews`：`id, project_id, user_id, rating(int2 1-5), content, created_at`，唯一约束 `(project_id, user_id)`。
- 接口：
  - GET `/api/projects/[id]/reviews?limit&offset`
  - POST `/api/projects/[id]/reviews`（登录用户）
  - DELETE `/api/projects/[id]/reviews/[rid]`（作者或项目所有者）

## 6.7 数据模型映射与字段定义（与现有表对齐）

- profiles（已存在）：`id, nickname, avatar_url, bio, reputation, updated_at`
- creatives（已存在）：`id, title, description, terminals[], bounty_amount, author_id, created_at, slug, upvote_count, comment_count`
- projects（已存在）：`id, name, description, status, developer_id, creative_id, product_info(jsonb), created_at, updated_at`
  - 建议补充字段：`is_deleted boolean default false, deleted_at timestamptz, paused_at timestamptz, prev_status text`
- project_logs（已存在）：`id, project_id, content, author_id, created_at`
- comments（已存在）：支持 `creative_id` 或 `project_log_id` 作为关联目标；支持多层回复
- comment_likes（已存在）：用于评论点赞
- 建议新增：
  - project_suggestions：建议箱（见 SQL）
  - project_favorites：项目收藏（见 SQL）

### product_info JSON Schema（用于发布态展示）

```json
{
  "slogan": "string(1-80)",
  "platforms": ["web", "ios", "android", "desktop"],
  "cover_url": "https://.../cover.jpg",
  "screenshots": ["https://.../1.jpg", "https://.../2.jpg"],
  "features": "string - 支持Markdown",
  "links": { "web": "https://...", "ios": "https://appstore...", "android": "https://play.google.com/...", "desktop": "https://..." },
  "release_notes": "string(0-2000)"
}
```

校验要点：
- platforms 至少一项；
- links 至少包含与 platforms 对应的可用链接；
- 图片链接允许为空数组（早期先发布文本）。

## 6.8 错误码与状态码

- 200 OK：读取成功
- 201 Created：创建成功（项目、日志、建议等）
- 204 No Content：删除成功（软删除/物理删除）
- 400 Bad Request：参数校验失败
- 401 Unauthorized：未登录或 Token 失效
- 403 Forbidden：无权限操作（非项目所有者/成员）
- 404 Not Found：资源不存在
- 409 Conflict：资源冲突（重复收藏、重复名称等）
- 422 Unprocessable Entity：业务校验未通过（如非法状态流转）
- 500 Internal Server Error：服务内部错误

## 6.9 性能与安全

- 性能：列表接口优先使用覆盖索引与 `hasMore` 判断，避免 `count(*)`；热点字段建立联合索引。
- 安全：
  - 仅后端使用 service_role 直连数据库；对外接口基于 Token 做细粒度校验。
  - 表层面开启 RLS（按需），策略限制写操作仅限资源所有者；
  - 所有写接口做字段白名单与长度/枚举校验，防注入与超长文本。

## 6.10 需要新增/变更的表与索引（SQL 附录）

以下 SQL 可直接在 Supabase 执行，一次性创建/变更所需表与索引（若存在则跳过）。

```sql
-- 修正版 V2：去掉 CREATE POLICY IF NOT EXISTS，改为 DROP POLICY IF EXISTS + CREATE POLICY
-- 目标：补充 projects 字段、创建建议箱/收藏/评价三张表及索引，并开启/配置 RLS 策略

-- 1) projects 补充字段（软删除/暂停）
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS paused_at timestamptz NULL;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS prev_status text NULL;

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_developer ON public.projects(developer_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_desc ON public.projects(created_at DESC);

-- 2) 建议箱表
CREATE TABLE IF NOT EXISTS public.project_suggestions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open|accepted|resolved|ignored
  handled_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_note text NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_project_suggestions_project ON public.project_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_suggestions_status ON public.project_suggestions(status);

-- 3) 项目收藏表
CREATE TABLE IF NOT EXISTS public.project_favorites (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 唯一性用唯一索引保证（而非约束，避免 IF NOT EXISTS 受限）
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_favorites_unique ON public.project_favorites(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_favorites_project ON public.project_favorites(project_id);
CREATE INDEX IF NOT EXISTS idx_project_favorites_user ON public.project_favorites(user_id);

-- 4) 项目评价表
CREATE TABLE IF NOT EXISTS public.project_reviews (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_reviews_unique ON public.project_reviews(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_reviews_project ON public.project_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reviews_rating ON public.project_reviews(rating);

-- 5) RLS 策略（启用 + 幂等创建）
-- 注意：若你在后端使用 service_role 访问数据库，这些策略不会限制后端；它们用于保护潜在的客户端直连场景

-- project_suggestions
ALTER TABLE public.project_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suggestions are public" ON public.project_suggestions;
CREATE POLICY "Suggestions are public"
  ON public.project_suggestions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Suggestions insert by self" ON public.project_suggestions;
CREATE POLICY "Suggestions insert by self"
  ON public.project_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Suggestions update by owner" ON public.project_suggestions;
CREATE POLICY "Suggestions update by owner"
  ON public.project_suggestions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_suggestions.project_id
        AND p.developer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_suggestions.project_id
        AND p.developer_id = auth.uid()
    )
  );

-- project_favorites
ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Favorites are public" ON public.project_favorites;
CREATE POLICY "Favorites are public"
  ON public.project_favorites
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Favorites insert by self" ON public.project_favorites;
CREATE POLICY "Favorites insert by self"
  ON public.project_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Favorites delete by self" ON public.project_favorites;
CREATE POLICY "Favorites delete by self"
  ON public.project_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- project_reviews
ALTER TABLE public.project_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are public" ON public.project_reviews;
CREATE POLICY "Reviews are public"
  ON public.project_reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Reviews insert by self" ON public.project_reviews;
CREATE POLICY "Reviews insert by self"
  ON public.project_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reviews update by self" ON public.project_reviews;
CREATE POLICY "Reviews update by self"
  ON public.project_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reviews delete by self" ON public.project_reviews;
CREATE POLICY "Reviews delete by self"
  ON public.project_reviews
  FOR DELETE
  USING (auth.uid() = user_id);
```

---

# 7. 数据与埋点

- 基础指标：项目浏览量、收藏量、分享点击量、建议提交数、建议处理时长、中位处理时长。
- 漏斗：创意页 → 点击“我来解决” → 提交创建 → 首次进入项目详情 → 首次发布开发日志 → 发布产品。
- 追踪方式：前端埋点 + 服务端计数（如以 Edge 中间层计数/数据库聚合）。

---

# 8. 兼容与非目标

- 兼容：`/project/*` → `/projects/*` 的 301 重定向已配置，继续保留一段时间。
- 非目标（v1 不包含）：
  - 多团队与复杂成员角色管理（仅支持所有者+简单协作成员）
  - 富媒体日志附件上传（暂用文本，后续规划）
  - 复杂排序权重算法（v1 采用浏览/收藏/时间的基础权重）

---

# 9. 分阶段实施计划（Edge Runtime + Cloudflare Pages）

- 里程碑 M0（本 PRD 定稿）
  - 本文档合并，路由与页面原型已就绪

- 里程碑 M1（数据与表结构）
  - 设计/对齐 projects、project_logs、project_suggestions 等表及索引（含 paused_at、is_deleted）
  - 脚本化迁移与回滚方案

- 里程碑 M2（API 与权限）
  - 实现：create/update/delete/pause/logs/suggestions 等接口（Edge Route Handlers）
  - 接入鉴权（Supabase token 校验），统一错误码

- 里程碑 M3（前端接入：项目详情）
  - 接入“开发日志发布与列表”“建议箱”
  - 接入“暂停/恢复”控件与状态边界处理

- 里程碑 M4（前端接入：我的项目）
  - 管理操作入口：编辑/删除
  - 空态与前端筛选完善

- 里程碑 M5（前端接入：产品广场）
  - 对接真实数据：released 列表、搜索与平台筛选
  - 卡片埋点与收藏能力

- 里程碑 M6（验证与上线）
  - 性能/安全/可用性检查（Edge 环境）
  - E2E 用例（创建→管理→发布→产品广场可见）
  - 渐进放量与监控告警

---

以上更新与现有代码 demo 保持一致，后续若 UI/交互调整，将同步在此文档中更新为权威依据。