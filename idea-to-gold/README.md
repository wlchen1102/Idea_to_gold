# 点子成金（Idea to Gold）

让真实痛点更快变成可用的 AI 产品。我们致力于最大化降低「从一个真实痛点」到「一个可用 AI 产品」之间的信息不对称与执行摩擦。

- 统一术语：全站使用「创意」而非「点子」
- 版本状态：V1.0 迭代中（原型/前端优先）
- 设计规范：主色 #2ECC71、辅色 #F1C40F、8px 网格（详见 docs/design.md）

文档导航：
- 产品需求（PRD）：docs/prd.md
- 设计规格（Design Spec）：docs/design.md
- 模块详述：
  - FR-101 创意信息流：docs/prd-3.1-FR101.md
  - FR-102 发布新创意：docs/prd-3.1-FR102.md
  - FR-103 创意详情页：docs/prd-3.1-FR103.md
  - FR-201/202 项目空间：docs/prd-3.2-FR201.md、docs/prd-3.2-FR202.md

---

## 功能概览（V1.0）

- 创意广场
  - FR-101 创意信息流（排序：热门/最新/高悬赏；筛选：期望终端/标签）
  - FR-102 发布新创意（AI 副驾查重与引导、三岔路口分流）
  - FR-103 创意详情（我也要、评论、悬赏、关联项目、我来解决）
- 项目空间
  - FR-201 项目创建与管理（与创意关联）
  - FR-202 项目主页（阶段状态、开发日志、最终发布）
- 产品发布
  - FR-301 产品陈列馆
  - FR-302 产品详情与评价（支持来自“我也要”用户的评分与评论）
- 我的
  - FR-401 个人信息管理
  - FR-402 声望系统
  - FR-403 徽章系统

当前实现重点：FR-102 页面原型（见 src/app/creatives/new/page.tsx），包含基础表单、AI 副驾侧栏（模拟）、相似创意提示（预置数据）、发布确认弹窗（三岔路口原型）。

---

## 技术栈

- 前端：Next.js 15（App Router，使用 src 目录）、React 19、TypeScript
- 样式：Tailwind CSS v4
- 代码质量：ESLint 9（eslint-config-next）
- 后端（规划）：Cloudflare Workers + Hono，数据库 D1，向量检索 Vectorize，对象存储 R2
- 模型调用（规划）：OpenAI 或 Gemini（Workers 内通过 fetch）

package.json（关键信息）：
- scripts：dev / build / start / lint
- 依赖：next 15.4.x、react 19.1.x、tailwindcss 4.x

Node 环境建议：Node.js ≥ 18

---

## 快速开始

1) 安装依赖
```bash
npm install
```

2) 启动开发服务器
```bash
npm run dev
# 浏览器访问 http://localhost:3000
```

3) 生产构建与启动
```bash
npm run build
npm run start
```

4) 代码检查
```bash
npm run lint
```

---

## 目录结构（摘录）

该项目启用 src 目录组织前端代码，以下为已确认/约定的关键路径：

```
idea-to-gold/
├─ package.json
├─ README.md
├─ docs/                        # PRD / 设计文档
│  ├─ prd.md
│  ├─ design.md
│  ├─ prd-3.1-FR101.md
│  ├─ prd-3.1-FR102.md
│  └─ prd-3.1-FR103.md
├─ src/
│  ├─ app/
│  │  ├─ creatives/
│  │  │  └─ new/page.tsx       # FR-102 发布新创意页面（原型）
│  │  └─ ...                   # 其他页面路由（按需补充）
│  └─ components/              # 复用组件（如 Modal/ConfirmationModal/CloseButton 等）
└─ public/                      # 静态资源
```

说明：
- 以上组件目录为约定位置，实际以仓库为准；新增组件请保持命名与职责清晰。
- 页面路由基于 App Router，优先 colocate 小型组件至就近目录，通用组件进入 src/components。

---

## FR-102：发布新创意（当前页面行为）

- 表单字段：标题、创意详情、期望终端（多选）、悬赏金额（可选开关+数值）
- AI 副驾：手动打开的侧栏（当前为模拟对话与“一键填充表单”）
- 相似创意：详情输入框失焦后显示预置建议，可预览、可“合并进去并 +1”
- 跨页通信（临时约定）：通过 localStorage 传递 toast 与评论注入
  - pendingToast、pendingComment:1、pendingSupport:1
- 发布确认（三岔路口原型）：合并进入相似创意 / 继续发布（本地跳转）

尚未接入的能力（计划中）：
- 登录前置校验、字段校验（长度/必填/≥1 个终端/悬赏为正整数）
- 查重接口：POST /api/v1/ideas/check_similarity（1.5s 防抖 + 失焦触发、加载/异常态）
- 发布接口：POST /api/v1/ideas/create（成功跳转详情，失败提示）
- 相似度阈值与弹窗分流（相似度 > 80% 时触发三岔路口）

---

## 近期路线图（建议执行顺序）

1) 前端校验完善：标题/描述长度、终端至少一项、悬赏≥1 且为正整数；按钮禁用与 Loading
2) 最小闭环 API（Next App Route Handlers，本地内存/Mock 即可）：
   - POST /api/v1/ideas/check_similarity
   - POST /api/v1/ideas/create
3) 将查重接入标题与描述（1.5s 防抖 + 失焦），补齐加载态、异常态
4) 基于相似度阈值实现“三岔路口”真实分流
5) 登录态检查占位（后续再对接 next-auth 或迁移 Workers/Hono 鉴权）
6) 渐进迁移到 Cloudflare Workers（D1/Vectorize/R2），整合 API 与前端

---

## 开发约定

- 术语统一：使用「创意」、CTA 使用「我也要」「我来解决」
- 代码风格：遵循 ESLint；函数尽量小、关注单一职责，避免重复代码
- UI 规范：遵循 docs/design.md（颜色/字号/8px 网格/组件状态）
- 提交信息：建议使用「type(scope): subject」简洁格式（如 feat(fr102): 表单校验）

---

## 贡献指南

欢迎通过 Issue/PR 参与：
- Bug 反馈：复现步骤、期望结果、实际结果、截图/日志
- 功能建议：动机、用户价值、PRD 粗稿（可参考模块详述文档粒度）
- 代码贡献：请提前创建分支（feature/xxx），提 PR 前通过 lint/本地自测

---

## 许可协议

待定（TBD）。在确定商业模式与开源策略后补充 License 信息。

---

## 致谢

- Next.js、React、Tailwind CSS
- Cloudflare 开发生态（Workers、D1、Vectorize、R2）
- 社区与贡献者