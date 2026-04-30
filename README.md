# Nexus

Nexus 是一个面向边缘运行环境设计的轻量级服务框架，基于 [Hono](https://hono.dev/) 构建，旨在为开发者提供简洁、高效、可扩展的边缘应用开发体验。

## 核心特性

### 边缘原生
- 部署于 Cloudflare Workers，享受全球分布式边缘计算优势
- 超低延迟响应，就近接入最近的数据中心
- 无服务器架构，无需管理基础设施

### 模块化设计
- 统一路由管理：灵活的路由系统支持分组和嵌套
- 生命周期中间件：Init → Auth → Business → Response 四阶段处理
- 状态管理：集中式的状态与执行逻辑管理

### 开发体验
- 简洁的 API 设计，易于上手
- 支持热重载开发模式
- 一键部署至边缘网络

## 技术栈

- **运行时**: Cloudflare Workers
- **框架**: Hono
- **语言**: TypeScript

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

### 部署上线

```bash
npm run deploy
```

### 生成类型定义

根据 Worker 配置生成/同步类型定义：

```bash
npm run cf-typegen
```

## 项目结构

```
nexus
├── src/
│   ├── router/          # 路由模块
│   │   └── router.ts    # 路由管理器
│   ├── utils/           # 工具函数
│   │   └── result.ts    # Result 类型封装
│   ├── error/           # 错误处理
│   │   └── error.ts     # 自定义错误类型
│   └── index.ts         # 应用入口
├── package.json
└── wrangler.toml        # Cloudflare Workers 配置
```

## 架构设计

### 路由系统

Nexus 提供了灵活的路由管理机制，支持：

- 基础路由分组（`group`）
- HTTP 方法绑定（`get`、`post` 等）
- 嵌套路由组合

### 中间件生命周期

```
Init → Auth → Business → Response
```

- **Init**: 全局初始化阶段
- **Auth**: 身份验证阶段
- **Business**: 业务逻辑处理阶段
- **Response**: 响应处理阶段

通过 `before` 和 `after` 配置，中间件可以声明执行顺序依赖关系。

## 应用示例

```ts
import { Router } from './router'

const router = new Router(() => Ok(new Hono()))

// 创建博客模块路由组
const blogGroup = router.group('/blog')

// 注册 GET 处理器
blogGroup.get('/posts', async (c) => {
    return c.json({ posts: [] })
})

// 启动应用
router.start()
```

## 当前状态

Nexus 目前正以博客模块为切入点，验证整体架构的可行性。核心的路由系统和中间件生命周期管理已经初步成型。

## License

MIT
