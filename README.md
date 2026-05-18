# Nexus

Nexus 是一个面向边缘运行环境设计的轻量级服务框架，基于 [Hono](https://hono.dev/) 构建，旨在为开发者提供简洁、高效、可扩展的边缘应用开发体验。

## 核心特性

- **边缘原生**: 部署于 Cloudflare Workers，享受全球分布式边缘计算优势
- **模块化路由**: 灵活的路由分组和嵌套机制
- **智能中间件**: 基于依赖关系的中间件自动排序系统
- **简洁 API**: 易于上手的开发体验

## 技术栈

- **运行时**: Cloudflare Workers
- **框架**: Hono
- **语言**: TypeScript
- **代码质量**: ESLint + Prettier

## 快速开始

### 安装

```bash
npm install
```

### 开发

```bash
npm run dev
```

### 部署

```bash
npm run deploy
```

## 项目结构

```
nexus
├── src/
│   ├── router/          # 路由模块
│   ├── utils/           # 工具函数
│   ├── error/           # 错误处理
│   └── index.ts         # 应用入口
├── eslint.config.js     # ESLint 配置
├── prettierrc           # Prettier 配置
├── package.json
└── wrangler.toml        # Cloudflare Workers 配置
```

## 架构设计

### 路由系统

Nexus 提供灵活的路由管理，支持分组和嵌套：

- `group()`: 创建子路由组
- `get()` / `post()`: 注册路由处理器

### 中间件系统

通过 `before` 和 `after` 声明中间件执行顺序依赖，系统自动进行拓扑排序。

```
A.before = [B]  // A 依赖 B，B 应在 A 之前执行
A.after = [C]   // A 依赖 C，C 应在 A 之后执行
```

## 当前状态

Nexus 正以博客模块验证架构可行性。

### 已实现

- ✅ 模块化路由系统
- ✅ 中间件依赖管理（DAG 拓扑排序）

### 计划中

- 🔄 生命周期阶段扩展（Init → Auth → Business → Response）
- 🔄 更多 HTTP 方法支持

## License

MIT
