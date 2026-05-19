# Build & Deploy

本项目采用前后端分离构建：

- 后端：Cloudflare Workers + Hono
- 前端：Lit + Vite

由于后端会引用前端构建产物，因此必须：

1. 先构建后端
2. 再构建前端

否则可能导致：

- 静态资源路径错误
- Workers 资源绑定失效
- dist 内容不完整

## Build Order

<span style="color:red;">注：在项目根目录下使用命令</span>

必须按以下顺序执行：

### 1. Build Backend

```bash
npm run build:server
```

### 2. Build Frontend

```bash
npm run build:client
```

## 当然，您可以直接部署，deploy 命令是已经按照先后端再前端

```bash
npm run deploy
```

## Why Backend Must Build First

后端构建阶段会：

- 初始化 Workers 配置
- 注入静态资源路径
- 生成运行时环境

如果前端先构建：

- Vite 输出可能被覆盖
- Workers assets 目录可能失效
- dev/prod 资源路径可能不一致
