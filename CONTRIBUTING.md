# 提交规范

Nexus 使用 Conventional Commits 规范来标准化提交信息。

## 格式

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

## 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响运行） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建或辅助工具变动 |

## 示例

### 新功能

```
feat(router): 添加中间件依赖排序功能
```

### 修复 bug

```
fix(middleware): 修复循环依赖检测遗漏问题
```

### 文档更新

```
docs: 更新 README 项目结构说明
```

### 重构

```
refactor(core): 简化错误处理逻辑
```

## 注意事项

- 使用中文描述提交内容
- subject 以动词开头，使用祈使语气
- subject 不超过 50 字符
- body 详细说明变更内容和动机
- 类型为可选，但建议添加 scope 指明影响范围
