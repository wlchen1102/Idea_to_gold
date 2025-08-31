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

- 解决“创意→产品”的断层：目前创意关注多、项目曝光少，“产品广场”面向所有用户展示已成型或在研产品，形成闭环。 
- 建立“供给侧”统一入口：访客无需登录即可浏览、收藏、分享，促成自然流量与口碑传播。 
- 促进创作者转化：把“创意热度”导流到“项目关注与使用”，提升留存与活跃。 
- 数据沉淀与评估：通过浏览、收藏、转化等指标，对产品优先级与演进方向做量化判断。 

## 创意广场（Creatives Square）需具备的功能

- 浏览与筛选：按行业、话题标签、热度、时间排序；支持关键字搜索。
- 互动：点赞/收藏、关注作者、评论与回复、举报/屏蔽不当内容。
- 创作：发布创意、编辑更新、标记“我来解决/我在做”。
- 流转：从创意一键发起项目；创意详情展示“衍生项目/已上线产品”列表。
- 运营：主编推荐、榜单（周/月/总榜）、话题活动页。

## 产品广场（projects Square）功能清单（V1）

- 产品卡片列表：名称、Slogan、平台标签（Web/iOS/Android/桌面）、封面图、核心指标（浏览/收藏）。
- 筛选与排序：按平台、状态（规划中/开发中/内测中/已发布）、最新/最热排序。
- 详情页：产品截图、功能亮点、应用链接、原始创意引用、团队成员、开发日志（节选）。
- 互动：收藏、分享、评价（星级+文字）。
- 数据埋点：PV/UV、收藏量、分享点击量。

## 所需接口文档（API 草案）

说明：所有需要个性化数据的接口，前端必须在请求头中携带 Authorization: Bearer <token>，后端使用 service_role 校验并返回数据。

- GET `/api/projects`
  - 描述：获取产品广场的产品列表（公共数据，无需登录）
  - Query：
    - `q`（可选，string）：关键字
    - `platform`（可选，enum）：web|ios|android|desktop
    - `status`（可选，enum）：planning|developing|internalTesting|released
    - `sort`（可选，enum）：latest|hottest
    - `limit`（默认 20，最大 50）、`offset`（默认 0）
  - 响应：
    ```json
    {
      "items": [
        {
          "id": "uuid",
          "name": "会议纪要自动化助手",
          "slogan": "释放你的会议生产力",
          "platforms": ["web", "ios"],
          "cover": "/cdn/xxx.jpg",
          "metrics": { "views": 1280, "favorites": 312 },
          "status": "developing",
          "fromIdea": { "id": "uuid", "title": "AI会议纪要助手" }
        }
      ],
      "total": 42
    }
    ```

- GET `/api/projects/[id]`
  - 描述：获取产品详情（公共数据）
  - 响应：
    ```json
    {
      "id": "uuid",
      "name": "会议纪要自动化助手",
      "slogan": "释放你的会议生产力",
      "platforms": ["web", "ios"],
      "screenshots": ["/cdn/s1.jpg", "/cdn/s2.jpg"],
      "features": "...",
      "links": { "web": "https://...", "ios": "https://..." },
      "status": "released",
      "fromIdea": { "id": "uuid", "title": "AI会议纪要助手" },
      "team": [ { "id": "uuid", "name": "Zoe" } ],
      "metrics": { "views": 1280, "favorites": 312 }
    }
    ```

- POST `/api/projects/[id]/favorite`
  - 描述：收藏/取消收藏（需要登录）
  - Body：`{ action: "add" | "remove" }`
  - 响应：`{ ok: true, favorites: 313 }`

- GET `/api/creatives`
  - 描述：创意广场创意列表（公共数据）
  - Query：`q`、`tag`、`sort`（latest|hottest）、`limit`、`offset`

- GET `/api/creatives/[id]`
  - 描述：创意详情（公共数据）；含“衍生项目/已上线产品”节选

- POST `/api/creatives`
  - 描述：发布创意（登录）
  - Body：`{ title, description, tags: string[] }`

- POST `/api/projects`
  - 描述：从创意发起项目（登录）；后端从 Token 读取 user_id 作为 owner
  - Body：`{ name, fromIdeaId, intro }`

- GET `/api/users/me/projects`
  - 描述：我的项目（登录）
  - Query：`status`、`limit`、`offset`

- GET `/api/projects/[id]`
  - 描述：项目详情（公共数据，暂可不含敏感字段）

- POST `/api/projects/[id]/release`
  - 描述：提交产品发布素材与信息（登录）
  - Body：`{ name, slogan, features, platforms: string[], logo, screenshots[] }`（multipart/form-data）

---

备注：上述接口均采用 Next.js Route Handlers 放在 `src/app/api/*`，服务端使用 service_role 与入参校验，前端通过 supabase.auth.getSession() 获取 token 并放入 Authorization 头。后续根据数据库表结构进行字段映射与完善。