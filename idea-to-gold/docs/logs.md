# 创意详情页“身份未识别 + 接口超时”问题排查与修复记录

时间：2025-08-26
环境：本地 Cloudflare Pages 开发服务（http://127.0.0.1:8788/），Supabase Postgres

## 一、问题现象（用户反馈）
- 从创意详情页停留几分钟后回到首页，再次进入详情页：
  - 点赞按钮状态异常：按钮高亮显示“我想要”，但其实用户已经点过；
  - 不显示“编辑”按钮（说明当前请求未识别到登录态或识别延迟）；
  - 评论区一直显示“加载中…”，等待数分钟仍无响应；
- 控制台多次出现 `Fetch request failed: timeout`、`Init upvote error: timeout`。

## 二、根因分析（依据日志与代码）
1. 后端接口存在高延迟路径：
   - 旧的 GET /api/creatives/[id]/upvote 实现会优先对 `creative_upvotes` 做精确计数（COUNT），在数据量上来后非常慢；
   - 评论列表接口未做分页，且排序/过滤未命中合适索引，导致全表扫描或外部排序，放大了接口尾延迟，引发前端超时。
2. 前端存在“登录态刷新竞态 + 请求未中止”问题：
   - 详情页初始化请求在 Token 未刷新完成时发出，后端把用户当作匿名；
   - 旧逻辑未对初始化 GET 与后续用户交互进行“最新请求判定”和中止，导致较晚返回的旧结果覆盖最新 UI；
   - 多个请求同时在途，没有统一的 timeout 与兜底，导致“加载中”卡死体验。

## 三、执行的数据库优化（已在 Supabase 执行）
以下索引避免全表扫描，支撑高频过滤/存在性查询与按创建时间排序：

```sql
-- 点赞存在性判定：用到 creative_id + user_id 的等值过滤
CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_user
ON public.creative_upvotes(creative_id, user_id);

-- 评论列表：按创意筛选 + 创建时间倒序分页
CREATE INDEX IF NOT EXISTS idx_comments_creative_created_desc
ON public.comments(creative_id, created_at DESC);

-- 评论点赞：存在性判定与去重
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user
ON public.comment_likes(comment_id, user_id);
```

为什么这些索引能解决问题？
- 当查询带有 `WHERE creative_id = ?`、`AND user_id = ?` 或需要 `ORDER BY created_at DESC` 时，B-Tree 索引能够让数据库直接定位需要的数据页，避免全表扫描与外部排序；
- 点赞“是否已点过”的场景，从“扫描整张表找一行”变成“用 (creative_id, user_id) 索引直达”，复杂度从 O(N) 降为 O(logN)；
- 评论列表的 `(creative_id, created_at DESC)` 复合索引使“过滤+倒序排序+limit/offset”走索引扫描，避免大量回表与排序开销，显著降低 P95/P99 延迟。

## 四、后端 API 调整（Next Route Handlers）
- 文件：src/app/api/creatives/[id]/upvote/route.ts
  - GET：改为直接读取 `creatives.upvote_count` 字段作为总数，只有在用户已登录时才用 `(creative_id,user_id)` 索引做“是否已点赞”的存在性查询；
  - 增加阶段耗时日志，便于后续排障。
- 文件：src/app/api/comments/route.ts
  - GET：新增 `limit` 和 `offset`（默认 limit=50），并按 `created_at DESC` 排序以匹配复合索引；
  - 增加耗时日志；避免一次性返回超大结果导致前端超时。

## 五、前端降载与超时兜底
- 文件：src/components/RightInfo.tsx（详情页右侧信息栏/点赞）
  - 初始化与点赞/取消点赞请求统一设置 `timeoutMs = 8000`；
  - 初始化请求引入 `AbortController`，并在组件卸载、重复发起时中止旧请求；
  - 使用 `getFreshAccessToken()` 等待尽可能新鲜的 Token，减少匿名态误判；
  - 增加“重试”按钮与错误提示；
  - 若本地缓存存在用户对该创意的“已想要”标记，先进行 UI 预热（并在后端返回后对齐最终状态）。
- 文件：src/components/CommentsSection.tsx（评论区）
  - 拉取列表、点赞、发表评论、删除评论的请求全部显式设置 `timeoutMs = 8000`；
  - 拉取列表增加中止控制与重试按钮，避免“加载中”卡死。

## 六、验证方法（建议）
1. 打开详情页，观察控制台 network：
   - /api/creatives/[id]/upvote GET 应在 100ms-数百 ms 返回（取决于网络）；
   - /api/comments?creative_id=...&limit=50 正常返回，尺寸可控；
2. 保持详情页停留 >5 分钟后切换页面再返回：
   - 仍能识别登录状态；
   - 点赞状态不会被过期的旧请求覆盖；
3. 断网或制造高延迟：
   - 8s 超时后出现“加载异常/重试”UI，点击重试可恢复。

## 七、结论
- 过去的“精确计数 + 不命中索引 + 未中止旧请求 + Token 刷新竞态”叠加导致超时和 UI 状态错乱；
- 通过为关键查询补充索引、缩短关键路径（读聚合字段代替精确 count）、引入请求中止与本地兜底，显著降低了接口尾延迟并改善了前端体验；
- 若后续仍偶发超时，可继续：
  - 观察后端耗时日志，定位是否存在异常慢查询；
  - 将前端预取策略（列表页 prefetch 支持状态）降频或加超时；
  - 视需要将 8s 再下调至 6s，并引入指数退避重试策略（目前暂不启用，遵循 YAGNI）。