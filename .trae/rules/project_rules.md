## 沟通原则
- 永远使用简体中文进行思考和对话
- 与我对话时，要注意我的理解是否正确。如果我理解错误，要及时提醒我。
- 与我对话时，要注意我的问题是否清晰。如果我问题不清晰，要及时提醒我。
- 你要有全栈开发的能力，包括前端、后端、数据库、服务器等。你会综合考虑数据库、后端代码、前端代码、服务器配置等因素，确保项目的功能完善、性能稳定、安全可靠。

## 代码原则
### KISS原则 (Keep It Simple, Stupid)
 - 鼓励AI编写简洁明了的解决方案。
 - 避免过度设计和不必要的复杂性。
 - 使代码更具可读性和可维护性。

### YAGNI原则 (You Aren't Gonna Need It)
 - 防止AI添加当前用不到的预测性功能。
 - 专注于实现当前已明确的需求。
 - 减少代码冗余和维护成本。

### SOLID原则
 - 单一职责原则 (Single Responsibility Principle)
 - 开闭原则 (Open-Closed Principle)
 - 里氏替换原则 (Liskov Substitution Principle)
 - 接口隔离原则 (Interface Segregation Principle)
 - 依赖倒置原则 (Dependency Inversion Principle)
 
 ### 代码通用规范
 - 优先保证代码简洁易懂。
 - 别搞过度设计，简单实用就好。
 - 写代码时，要注意圈复杂度，函数尽量小，尽量可以复用，尽量不写重复代码。
 - 写代码时，注意模块设计，尽量使用设计模式。
 - 写代码时，添加必要的中文注释，便于我理解。
 - 仅修改与特定请求直接相关的代码。避免更改无关的功能。
 - 改动或者解释代码前，必须看完所有相关代码，不能偷懒。
 - 接收到问题时，要将问题分为较小的步骤，在实施之前单独考虑每个步骤。
 - 在更改之前，请始终根据代码和日志的证据提供推理。
 - 修改代码以后，要及时反思，是否真的能够解决问题。
 - 给我解释代码的时候，说人话，别拽专业术语。最好有图（mermaid风格）
 - 帮我实现的时候，需要给出原理，并给出执行步骤，最好有图（mermaid风格）
 
 ## 代码架构（Code Architecture）
- 编写代码的硬性指标，包括以下原则：
  （1）对于 Python、JavaScript、TypeScript 等动态语言，尽可能确保每个代码文件不要超过 400 行
  （2）对于 Java、Go、Rust 等静态语言，尽可能确保每个代码文件不要超过 500 行
  （3）每层文件夹中的文件，尽可能不超过 8 个。如有超过，需要规划为多层子文件夹

- 除了硬性指标以外，还需要时刻关注优雅的架构设计，避免出现以下可能侵蚀我们代码质量的「坏味道」：
  （1）僵化 (Rigidity): 系统难以变更，任何微小的改动都会引发一连串的连锁修改。
  （2）冗余 (Redundancy): 同样的代码逻辑在多处重复出现，导致维护困难且容易产生不一致。
  （3）循环依赖 (Circular Dependency): 两个或多个模块互相纠缠，形成无法解耦的“死结”，导致难以测试与复用。
  （4）脆弱性 (Fragility): 对代码一处的修改，导致了系统中其他看似无关部分功能的意外损坏。
  （5）晦涩性 (Obscurity): 代码意图不明，结构混乱，导致阅读者难以理解其功能和设计。
  （6）数据泥团 (Data Clump): 多个数据项总是一起出现在不同方法的参数中，暗示着它们应该被组合成一个独立的对象。
  （7）不必要的复杂性 (Needless Complexity): 用“杀牛刀”去解决“杀鸡”的问题，过度设计使系统变得臃肿且难以理解。
- 【非常重要！！】无论是你自己编写代码，还是阅读或审核他人代码时，都要严格遵守上述硬性指标，以及时刻关注优雅的架构设计。
- 【非常重要！！】无论何时，一旦你识别出那些可能侵蚀我们代码质量的「坏味道」，都应当立即询问用户是否需要优化，并给出合理的优化建议。

## UI美观要求如下：
4. 简洁的勾线图形化作为数据可视化或者配图元素。
5. 运用高亮色自身透明度渐变制造科技感，但是不同高亮色不要互相渐变。
6. 模仿 apple 官网的动效，向下滚动鼠标配合动效。
7. 数据可以引用在线的图表组件，样式需要跟主题一致。
8. 使用 Framer Motion(通过CDN引入)。
9. 使用HTML5、TailwindCSS v4 和必要的JavaScript。
10. 使用专业图标库如Font Awesome或Material Icons （通过CDN引入)。
11. 避免使用emoji作为主要图标。

## 如果你要执行终端命令，必须一个一个执行，当一个执行完，再执行下一个，不允许使用“&&”执行多个终端命令
- 例如：
  - 正确：
    - ```bash
      npm install
      npm run build
      ```
  - 错误：
    - ```bash
      npm install && npm run build
      ```

## 修复 Bug 原则
当你被要求修复一个 Bug 时，请遵循以下步骤：
1.  **理解问题 (Understand):** 仔细阅读 Bug 描述和相关代码，复述你对问题的理解。
2.  **分析原因 (Analyze):** 提出至少两种可能的根本原因。
3.  **制定计划 (Plan):** 描述你打算如何验证这些原因，并给出修复方案。
4.  **请求确认 (Confirm):** 在动手修改前，向我确认你的计划。
5.  **执行修复 (Execute):** 实施修复。
6.  **审查 (Review):** 查看自己的修改有没有问题。
7.  **解释说明 (Explain):** 解释你做了哪些修改以及为什么。

## 项目运行
- 我会 npm run dev 启动开发服务，运行在http://127.0.0.1:8788/，你不需要再次启动服务


# 项目上下文说明书：Idea-to-Gold

你好，我是这个项目的开发者。请将此文档作为我们协作的最高准则和唯一信息来源。在提供任何代码、建议或修改之前，请务必参考本文档中定义的技术栈、架构和约定。

## 1. 项目概述 (Project Overview)

- **项目名称**: Idea-to-Gold
- **目标**: 创建一个全栈 Web 应用，让用户可以发布、展示和交流他们的创意。核心功能是 "发布新创意"，包括文本描述和图片上传。
- **我的角色**: 我是初学者，需要清晰、分步的指导和可直接使用的代码片段。

## 2. 技术栈 (Tech Stack)

- **前端 (Frontend)**:
  - **框架**: React+next.js
  - **语言**: TypeScript / TSX
  - **组件**: 函数式组件 (Functional Components) with Hooks

- **后端 (Backend)**:
  - **运行时**: Node.js
  - **框架**: **无特定框架 (如 Express)，直接使用 Cloudflare Workers 的原生 API**。我们的后端逻辑将以无服务器函数 (Serverless Functions) 的形式运行
  - **语言**: TypeScript

- **数据库 (Database)**:
  - **服务**: Supabase
  - **底层数据库**: PostgreSQL
  - **交互方式**: 使用官方 `supabase-js` V2 客户端库进行交互。

- **文件/对象存储 (Object Storage)**:
  - **服务**: Cloudflare R2
  - **交互方式**: 使用 AWS S3 SDK V3 (`@aws-sdk/client-s3`)，因为 R2 兼容 S3 API。

## 3. 部署架构 (Deployment Architecture)

- **前端部署**: Cloudflare Pages
- **后端部署**: Cloudflare Pages Functions
- **CI/CD**: 通过将代码推送到 GitHub 主分支，自动触发 Cloudflare Pages 的构建和部署。前端和后端在同一个仓库，一同部署。

## 4. 项目结构 (Project Structure)

请严格遵守以下目录结构：

```
idea-to-gold/
├─ functions/
│ └─ api/
│ └─ [...].ts # 所有后端 API 路由都写在这里，采用文件路由系统
├─ src/
│ ├─ app/ # 前端页面路由 (React)
│ └─ components/ # 可复用的 React 组件
├─ public/ # 静态资源
├─ .dev.vars # [本地开发专用] 存储环境变量，绝不能提交到 Git
├─ .gitignore # 必须包含 .dev.vars
├─ package.json
└─ PROJECT_CONTEXT.md # 本文档
```
**重要规则**：
- **`functions/`**: **这是所有后端代码的存放位置**。Cloudflare Pages 会自动将此目录下的文件部署为 Serverless Functions。我们将使用文件系统路由，例如 `functions/api/creatives.ts` 会对应 `/api/creatives` 这个 API 端点。
- **`src/`**: 所有前端 React 代码。

## 5. 环境变量 (Environment Variables)

所有敏感信息（密钥、URL）都必须通过环境变量注入，**严禁硬编码**。

- **本地开发**: 环境变量存储在根目录的 `.dev.vars` 文件中。
- **生产环境**: 环境变量将在 Cloudflare Pages 的项目设置中配置。
- **变量名约定**:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (后端专用)
  - `VITE_SUPABASE_URL` (前端专用)
  - `VITE_SUPABASE_ANON_KEY` (前端专用)
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`

## 6. 关键库和SDK (Key Libraries)

- **Supabase**: `@supabase/supabase-js`
- **Cloudflare R2**: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

## 7. 核心开发原则 (Core Development Principles)

1.  **环境变量优先**:任何敏感信息（如Supabase的URL和密钥、R2的访问密钥等）绝对不能硬编码在代码中。必须通过环境变量来访问。在为我生成代码时，请始终使用 `process.env.VARIABLE_NAME` (在Cloudflare环境中，通过 `context.env.VARIABLE_NAME` ) 的形式，并在注释中提醒我需要在Cloudflare的仪表盘中设置这些变量。

2.  **无服务器思维**: 所有后端 API 必须是无状态的 (Stateless)。不要在函数内存中存储任何需要在多次请求之间保持的数据。所有状态都应持久化到 Supabase。

3.  **前后端分离**: 前端通过 `fetch` API 调用相对路径 `/api/...` 上的后端端点。后端 API 负责与数据库和 R2 等服务交互，并将数据返回给前端。

---