# 开发日志
按时间倒序显示，最新的在上面。

---

## 账户设置页面优化和语法错误修复 2025-01-21
### 问题描述：
1. 账户设置页面修改后出现两个"保存成功"的div提示，且提示一直存在
2. AuthContext.tsx文件中存在TypeScript语法错误
3. account/page.tsx文件中存在遗留的setMessage调用错误

### 解决方案：
1. **Toast提示系统优化**：
   - 复用现有的ToastListener.tsx组件，避免重复开发
   - 移除account/page.tsx中重复的保存成功提示div
   - 使用localStorage和window事件触发全局Toast提示
   - 删除不再使用的message状态变量

2. **语法错误修复**：
   - 修复AuthContext.tsx中cleanup函数的类型处理问题
   - 重构useEffect中的异步清理逻辑，正确处理Promise返回值
   - 移除account/page.tsx中所有对已删除setMessage函数的调用
   - 替换为console.warn和全局Toast提示

3. **UI间距调整**：
   - 调整右上角头像按钮间距：头像和昵称间距从gap-3减少到gap-1.5
   - 按钮内边距从p-1调整为px-2 py-1，增加水平间距

### 技术要点：
- 复用现有组件避免重复造轮子的重要性
- TypeScript异步函数返回值的正确处理方式
- 全局Toast系统的统一使用策略
- 代码修改前的充分调研和检查

### 验证结果：
- ✅ TypeScript编译检查通过，无语法错误
- ✅ 账户设置页面Toast提示正常工作
- ✅ UI间距调整符合设计要求

---

## 评论区性能优化 2025-08-29
### 问题描述：
评论区加载缓慢，用户体验差：
- 评论区显示"加载中..."状态长达10秒
- 前端总耗时3774ms，API调用3774ms
- 后端总耗时2397ms，查询耗时2397ms
- 缓存完全未命中，每次都是全新查询

### 根本原因分析：
1. **数据库查询性能瓶颈**：
   - 缺乏针对评论查询的有效索引
   - `comments` 表按 `creative_id` 和 `created_at` 查询缺乏复合索引
   - `comment_likes` 表的点赞数据查询效率低下
   - 数据库统计信息过时，查询计划不优化

2. **认证流程性能问题**：
   - JWT token验证耗时888ms
   - 每次API调用都进行数据库用户查询验证

3. **缓存策略缺失**：
   - 前端缺乏有效的HTTP缓存机制
   - 后端未实现查询结果缓存

### 解决方案和实施：

#### 1. 数据库索引优化
创建了针对性的复合索引：
```sql
-- 创意评论查询的核心索引
CREATE INDEX CONCURRENTLY idx_comments_creative_created 
ON comments (creative_id, created_at DESC);

-- 评论点赞查询的复合索引
CREATE INDEX CONCURRENTLY idx_comment_likes_comment_user 
ON comment_likes (comment_id, user_id);

-- 用户评论查询索引
CREATE INDEX CONCURRENTLY idx_comments_author_created 
ON comments (author_id, created_at DESC);

-- 父评论查询索引
CREATE INDEX CONCURRENTLY idx_comments_parent 
ON comments (parent_comment_id) 
WHERE parent_comment_id IS NOT NULL;

-- 项目日志评论索引
CREATE INDEX CONCURRENTLY idx_comments_project_log 
ON comments (project_log_id) 
WHERE project_log_id IS NOT NULL;

-- 用户昵称搜索索引
CREATE INDEX CONCURRENTLY idx_profiles_nickname 
ON profiles (nickname);

-- 更新统计信息
ANALYZE comments, comment_likes, profiles;
```

#### 2. 认证流程优化
- 移除了API中的冗余数据库用户查询
- 直接使用JWT token中的用户信息
- 认证耗时从888ms降至0ms

#### 3. 缓存策略优化
- 前端添加了 `cache: 'default'` 选项
- 后端API响应添加了 `Cache-Control` 头
- 移除了无效的内存缓存机制

### 优化效果验证：

**第一次测试（索引优化后）：**
- 查询时间：2397ms → 1250ms（提升48%）
- 前端总耗时：3774ms → 2544ms（提升33%）
- 认证耗时：888ms → 0ms（提升100%）

**第二次测试（缓存测试）：**
- 查询时间：1884ms（仍有提升空间）
- 前端总耗时：3065ms（整体稳定提升）

### 关键经验总结：

1. **数据库性能优化**：
   - 复合索引比单列索引更有效，特别是包含排序字段的查询
   - `ANALYZE` 命令对查询计划优化至关重要
   - 部分索引（WHERE条件）可以减少索引大小和维护成本

2. **认证性能优化**：
   - JWT token验证应该在应用层完成，避免每次数据库查询
   - 合理利用token中的用户信息，减少额外查询

3. **性能监控策略**：
   - 前后端分离的性能监控有助于定位瓶颈
   - 控制台日志是快速诊断性能问题的有效工具
   - 多次测试验证优化效果的稳定性

4. **架构设计原则**：
   - 数据库查询优化是性能提升的关键环节
   - 缓存策略需要前后端协同设计
   - 性能优化应该是渐进式的，逐步验证每个改进点

### 后续优化方向：
- 考虑实现Redis缓存层
- 评估是否需要数据库连接池优化
- 监控生产环境的实际性能表现

---

## 评论接口重复调用问题  2025-08-29
### 原因：
1. **React 严格模式**：Next.js 开发环境默认启用 React 严格模式，会导致 `useEffect` 被执行两次
2. **useEffect 依赖问题**：依赖数组 `[ideaId, initialComments]` 在组件初始化时会触发多次执行
3. **组件状态变化**：`initialComments` 从 `undefined` 变为 `null` 会触发 `useEffect` 重新执行

### 解决方法和经验：
1. **使用 useRef 防重复调用**：
   ```typescript
   const fetchedRef = React.useRef(false);
   if (ideaId && !fetchedRef.current) {
     fetchedRef.current = true;
     fetchComments(ideaId);
   }
   ```

2. **优化 useEffect 依赖**：移除 `initialComments` 依赖，只保留 `[ideaId]`

3. **开发环境调试技巧**：
   - 使用浏览器网络面板监控 API 调用次数
   - React 严格模式在开发环境会导致副作用执行两次，这是正常现象
   - 生产环境不会有此问题，但仍需防范

4. **架构经验**：
   - 对于可能重复执行的副作用，使用 ref 标记是有效的防护手段
   - useEffect 依赖数组要谨慎设计，避免不必要的重新执行
   - 在组件设计时要考虑 React 严格模式的影响