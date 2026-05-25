# Nexus

Nexus 是一个面向边缘运行环境设计的全栈 Web 应用框架，后端基于 [Hono](https://hono.dev/) 运行于 [Cloudflare Workers](https://workers.cloudflare.com/)，前端采用 [Lit](https://lit.dev/) 构建 Web Components。

## 技术栈

| 层级       | 技术                  |
| ---------- | --------------------- |
| 后端运行时 | Cloudflare Workers    |
| 后端框架   | Hono                  |
| 前端框架   | Lit                   |
| 构建工具   | Vite                  |
| 样式方案   | TailwindCSS + DaisyUI |
| 开发语言   | TypeScript            |

## 项目结构

```
nexus/
├── packages/
│   ├── client/                 # 前端应用
│   │   ├── src/
│   │   │   ├── components/     # Web 组件
│   │   │   ├── views/          # 页面视图
│   │   │   └── utils/          # 工具函数
│   │   ├── pages/             # HTML 页面
│   │   └── vite.config.ts
│   │
│   └── server/                 # 后端应用
│       ├── src/
│       │   ├── route/          # 路由定义
│       │   ├── error/          # 错误处理
│       │   ├── server/         # 服务器初始化
│       │   └── utils/          # 工具函数
│       └── wrangler.jsonc      # Workers 配置
│
├── docs/                       # 项目文档
├── vitest.config.ts            # 测试配置
├── eslint.config.js            # ESLint 配置
├── prettierrc                  # Prettier 配置
└── package.json
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发

```bash

npm run dev:server   # 开发后端
npm run dev:client   # 开发前端
```

### 构建

由于后端引用前端构建产物，必须按顺序构建：

```bash
npm run build:server   # 先构建后端
npm run build:client    # 再构建前端
```

或直接：

```bash
npm run deploy         # 构建并部署
```

### 代码质量

```bash
npm run lint           # ESLint 检查
npm run format         # Prettier 格式化
npm run test           # 运行测试
```

## 架构设计

### 后端路由

采用模块化路由设计，支持路由分组和嵌套：

```
RootRoute
├── ApiRoute
│   ├── TestRoute
│   └── AdminRoute
```

### 前端组件

基于 Lit 的 Web Components 架构：

- `components/`: 可复用 UI 组件
- `views/`: 页面级组件
- `pages/`: HTML 入口

### API 文档

Nexus 会自动收集路由元信息生成 API 文档，访问 `/api/docs` 查看。

## 核心模块

### 路由系统

- `setRoute()`: 路由组注入

### 中间件系统

通过 `before` 和 `after` 声明执行顺序依赖，系统自动进行拓扑排序。

## License

MIT
