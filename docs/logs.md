# 开发日志
按时间倒序显示，最新的在上面。

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