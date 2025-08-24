## 沟通原则
- 永远使用简体中文进行思考和对话
- 与我对话时，要注意我的理解是否正确。如果我理解错误，要及时提醒我。
- 与我对话时，要注意我的问题是否清晰。如果我问题不清晰，要及时提醒我。
- 你有全栈开发的能力，包括前端、后端、数据库、服务器等。你会综合考虑数据库、后端代码、前端代码、服务器配置等因素，确保项目的功能完善、性能稳定、安全可靠。
- 如果有需要我执行的数据库SQL，请放到代码块中输出给我。SQL尽可能放到一个文件中，如果实在无法在一个文件里执行，你再拆开，然后说清楚每个步骤和对应的SQL语句。

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
 - 给我解释代码的时候，说人话，别拽专业术语，简单明了最好。
 - 帮我实现的时候，需要给出原理，并给出执行步骤。
 
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

## 【重要】Next.js + Cloudflare Pages（next-on-pages）项目开发规则：

### **核心技术栈与部署模型**
*   **【必须】** 本项目采用 **Next.js App Router** 框架，并统一部署到 **Cloudflare Pages**，构建命令是：npx @cloudflare/next-on-pages@1。
*   **【必须】** 后端API**必须**使用Next.js原生的**API路由 (Route Handlers)**，并存放在 `src/app/api/` 目录下。
*   **【禁止】** **绝对禁止**在项目中使用 `functions/` 目录，以避免与Next.js API路由产生冲突。

### **共享代码文件组织**

1.  **【必须】可复用的UI组件存放在 `src/components/`**。
    *   所有非页面级的、可在多个页面复用的React组件（如按钮、卡片、弹窗），都必须放在这里。

2.  **【必须】通用工具函数和SDK客户端存放在 `src/lib/`**。
    *   所有与UI无关的、可在前后端复用的工具函数（如日期格式化、slug生成器）或SDK客户端实例（如 `supabase.ts`），都必须放在这里。

---

### **后端代码生成规则**

#### **规则一：严格的API路由与文件结构 (Routing & Structure)**

1.  **【必须】API必须按照RESTful资源进行文件夹组织**。所有API都必须存放在 `src/app/api/`下。
    *   **示例**: `/api/auth`, `/api/creatives`, `/api/users`。
2.  **【必须】API逻辑由 `route.ts` 文件定义**，API逻辑必须由大写的 `GET`, `POST`, `PATCH`, `DELETE` 函数来处理请求。

#### **规则二：安全第一 (Security First)**

1.  **【绝对禁止】硬编码任何密钥**。所有敏感信息（数据库连接、密钥）**必须**通过环境变量 (`context.env.VARIABLE_NAME`) 来获取。
2.  **【必须】对所有“写入”操作进行身份验证**。任何会修改数据的API（`POST`, `PATCH`, `DELETE`），**必须**在执行核心逻辑前，先从请求头中获取JWT令牌，并验证用户是否已登录。
3.  **【必须】永远不要相信前端的数据**。后端在将数据写入数据库之前，**必须**对所有从前端接收到的数据，进行**服务器端的校验**（例如，检查字段是否为空、格式是否正确）。
4.  **【必须】使用`service_role`密钥进行数据库操作**。在后端API中初始化Supabase客户端时，**必须**使用具有最高权限的`service_role`密钥，以绕过RLS策略进行内部管理。

#### **规则三：数据库交互最佳实践 (Database Best Practices)**

1.  **【必须】使用UUID作为主键，使用Slug作为URL标识符**。
2.  **【必须】写入操作要明确归属**。在向数据库 `insert` 或 `update` 数据时，`author_id` 或 `user_id` 这类字段，**必须**从**后端验证过的JWT令牌**中获取，**绝对不能**使用前端直接传递过来的用户ID。

---

### **前端代码生成规则(Frontend Pages)**
*本规则旨在指导AI生成更高质量、更规范的前端代码，以确保顺利通过CI/CD构建流程，并提升项目的可维护性。在生成任何`.tsx`或`.ts`文件时，都必须严格遵守以下规则。*

#### **规则一：前端页面文件组织 (`src/app/`)**
*   **【必须】使用路由组 (Route Groups) 进行场景隔离**。所有页面都必须归属于以下三大路由组之一：
    *   `(marketing)`: **访客区** (落地页、关于我们等)。
    *   `(auth)`: **入口区** (登录、注册等)。
    *   `(app)`: **核心区** (登录后才能访问的核心应用页面)。
*   **【必须】页面UI由 `page.tsx` 文件定义**。
*   **【必须】** 在路由组内部，应按功能模块（如`creatives`, `settings`）进一步组织文件夹。

#### **规则二：TypeScript规范 (Type Safety)**

1.  **【绝对禁止 any 类型】**： 在任何变量、函数参数或返回值的类型定义中，绝对禁止使用 any 类型。必须为所有数据寻求最具体的类型定义（interface, type, 或从库中导入的类型）。
2.  **【禁止不安全的非空断言】**：
    *   **【绝对禁止】** 在**可选链 (`?.`)** 表达式的后面，使用**非空断言 (`!`)**。
    *   **原因**: 这种写法 (`variable?.property!`) 在逻辑上自相矛盾，且极易引发运行时错误。
    *   **【必须】** 使用**更安全**的方式来处理可能为`undefined`的值，例如：
        *   **空值合并运算符**: `const name = user?.profile?.nickname ?? '默认昵称';`
        *   **完整的可选链**: `const city = user?.profile?.address?.city;`

#### **规则三：代码整洁度(Code Cleanliness)**

1.  **【必须】代码即意图**: 最终生成的代码中，**不应该包含**任何被定义了但从未被使用过的变量、函数或导入。
2.  **【必须】对“有意为之”进行标记**:
    *   如果在函数参数中，某个变量（如 `event` 或 `_`）因为函数签名而必须存在，但其内部逻辑确实没有使用到它，**必须**在该变量名前加上**下划线 `_`** (例如 `_event`)，以明确告知ESLint这是“有意为之”。
    *   **示例 (错误)**: `myArray.map((item, index) => { return <div>{item.name}</div> })` (这里的 `index` 未被使用)
    *   **示例 (正确)**: `myArray.map((item, _index) => { return <div>{item.name}</div> })`

#### **规则四：遵守“Hooks规则” (Respect the Rules of Hooks)**

1.  **【必须】补全`useEffect`依赖项**:
    *   在生成任何 `useEffect` Hook时，**必须**仔细检查其内部逻辑引用了哪些外部变量或函数。
    *   所有被引用的外部依赖，都**必须**被完整地、无遗漏地添加到`useEffect`末尾的依赖数组 `[...]` 中。
    *   **示例 (错误)**: `const [id, setId] = useState(1); useEffect(() => { fetch('/api/data/' + id); }, [])` (遗漏了 `id` 依赖)
    *   **示例 (正确)**: `const [id, setId] = useState(1); useEffect(() => { fetch('/api/data/'' + id); }, [id])`

#### **规则五：遵循“Next.js最佳实践” (Next.js Best Practices)**

1.  **【必须】使用 `<Image />` 组件**:
    *   在任何需要显示图片的地方，**必须**优先使用从 `next/image` 导入的 `<Image />` 组件，而不是原生的 `<img>` 标签。
    *   **必须**为 `<Image />` 组件提供明确的 `width`, `height`, 和 `alt` 属性，以实现最佳的性能和可访问性。
2.  **绝对禁止** 把“代码 diff 标记”（行首的 + / -）误带进源码，因为这样会导致 TSX 无法解析，每次写完前端代码都需要检查。
3. **正确处理JSX中的特殊字符**：
    *   **【必须】** 在JSX的文本节点中，如果需要显示双引号 (")、大括号 ({ }) 等特殊字符，必须进行转义。
    *   **原因**: 防止潜在的渲染错误和安全风险 (XSS)。
    *   **【推荐】** 的转义方式：
        *   双引号: 使用 {'"'} 或者HTML实体 &quot;。
        *   大括号: 使用 {' {'} 和 {' }'}。
    *   **示例 (错误)**: <div> "你好" </div>
    *   **示例 (正确)**: <div>{'"你好"'}</div>

#### **规则六：禁止把 git diff 风格的 “- … / + …” 行误带进源码**
- 严禁将任何代码 diff 标记混入源码：包括行首的 “+ ”、“- ”、以及 “@@ … @@”、“+++ …”、“--- …” 等统一 diff 语法元素。
- 生成或修改代码时，必须输出“最终代码”，不得使用补丁/差异（diff）样式。
- 在 TSX/TS 文件中，任何以 “+ ”或 “- ”开头的行，除非是字符串字面量中的业务文案，均视为非法。
- JSX 中的数组 map 等复杂表达式，类型断言若改变了优先级，必须用括号包裹断言后的表达式，确保括号配平再提交。

本规则集旨在为项目提供一套清晰、可扩展的文件组织规范。所有未来的代码生成与修改，都必须严格遵守。*

---

## 项目运行
- 我会 npm run dev:cf 启动cloudflare开发服务，运行在http://127.0.0.1:8788/，你不需要再次启动服务

# 项目上下文说明书：Idea-to-Gold

你好，我是这个项目的开发者。请将此文档作为我们协作的最高准则和唯一信息来源。在提供任何代码、建议或修改之前，请务必参考本文档中定义的技术栈、架构和约定。

## 1. 项目概述 (Project Overview)

- **项目名称**: Idea-to-Gold
- **目标**: 创建一个全栈 Web 应用，让用户可以发布、展示和交流他们的创意。核心功能是 "发布新创意"，包括文本描述和图片上传。
- **我的角色**: 我是初学者，需要清晰、分步的指导和可直接使用的代码片段。

## 2. 技术栈 (Tech Stack)

- **前端 (Frontend)**:
  - **框架**: React+next.js 15
  - **状态管理**: React Query
  - **路由**: Next.js App Router
  - **语言**: TypeScript / TSX
  - **组件**: 函数式组件 (Functional Components) with Hooks

- **后端 (Backend)**:
  - **运行时**: Node.js
  - **框架**: **无特定框架 (如 Express)，直接使用 Cloudflare Workers 的原生 API**。我们的后端逻辑将以无服务器函数 (Serverless Functions) 的形式运行
  - **语言**: TypeScript
  - 每次写好接口，都需要使用测试命令测试接口，确保接口返回的状态码是200，并且返回的数据是正确的。

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

Cloudflare Pages 构建配置说明：

- 构建命令：npx @cloudflare/next-on-pages@1
- 构建输出目录：.vercel/output/static
- 构建根目录：idea-to-gold
- 提醒：使用 next-on-pages 时，不要再依赖 functions/ 目录处理 /api/*，以免被 Next Worker 遮蔽。

## 4. 项目结构 (Project Structure)

请严格遵守以下目录结构：

```
idea-to-gold/
├─ src/
│  ├─ app/                       # 前端页面路由（Next.js App Router）
│  │  ├─ api/                    # 唯一的后端 API 路由位置（Next.js Route Handlers）
│  │  │  ├─ creatives/           # 示例业务路由：/api/creatives
│  │  │  │  ├─ route.ts          # 列表 GET、创建 POST（Edge Runtime）
│  │  │  │  └─ [id]/             # 动态路由：/api/creatives/[id]
│  │  │  │     └─ route.ts       # 单条 GET（Edge Runtime；params: Promise<{ id: string }>）
│  │  │  └─ ...                  # 其他 API 路由，均以 route.ts 命名
│  │  ├─ page.tsx                # 示例页面文件
│  │  └─ layout.tsx              # 应用级布局
│  ├─ components/                # 可复用的 React 组件
│  ├─ lib/                       # 工具函数、SDK 封装（如 Supabase 客户端）
│  └─ data/                      # 静态数据或类型（非机密）
├─ public/                       # 静态资源（图片、favicon 等）
├─ .dev.vars                     # 本地开发环境变量（切勿提交到 Git）
├─ .gitignore                    # 必须包含 .dev.vars
├─ next.config.ts                # Next.js 配置（确保未设置 output: 'export'）
├─ tsconfig.json                 # TypeScript 配置（路径别名等）
├─ package.json                  # 依赖与脚本
├─ eslint.config.mjs             # ESLint 配置

```
*本规则集旨在为项目提供一套清晰、可扩展的文件组织规范。所有未来的代码生成与修改，都必须严格遵守。*

#### **核心设计哲学：路由即结构，万物皆组件**

1.  **前端页面**和**后端API**共享同一套**基于文件系统的路由系统**。
2.  严格遵循**按功能/资源模块**进行文件夹组织。
3.  通过**路由组 (Route Groups)** 实现不同场景下的布局隔离。

---

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