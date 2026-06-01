# Lightpanda 详细用法

Lightpanda 是一个浏览器引擎，可直接输出 Markdown 和可访问性树，无需外部转换器。

## 安装

```bash
# macOS / Linux (Bash/Zsh)
curl -sL https://github.com/lightpanda-io/browser/releases/latest/download/install.sh | bash

# 或直接下载二进制
# https://github.com/lightpanda-io/browser/releases

# 验证安装
lightpanda version
```

详细安装说明：https://lightpanda.io/docs/open-source/installation

## 基本命令

```bash
lightpanda fetch --dump <format> [options] <URL>
```

## 输出格式

| 格式 | 用途 | 特点 |
|------|------|------|
| `markdown` | AI/LLM 上下文、摘要 | CommonMark 格式，体积小，保留语义结构（链接、标题、列表、表格） |
| `html` | 归档、对比、调试 | 完整 JavaScript 渲染后 HTML |
| `semantic_tree` | 结构化解析、无障碍审计 | JSON 格式可访问性树，适合程序化处理 |
| `semantic_tree_text` | 快速审查、调试 | 人类可读的语义树格式 |

## 常用选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `--strip-mode <mode>` | 过滤标签组，可组合使用（逗号分隔） | `--strip-mode js,css` |
| `--with-frames` | 包含 iframe 内容 | `--with-frames` |
| `--wait-ms <ms>` | 等待时间（毫秒），默认 5000 | `--wait-ms 10000` |
| `--wait-until <event>` | 等待事件类型 | `--wait-until networkidle` |
| `--obey-robots` | 遵守 robots.txt | `--obey-robots` |
| `--http-proxy <proxy>` | HTTP 代理（可含认证） | `--http-proxy user:pass@proxy:8080` |
| `--with-base` | 添加 `<base>` 标签 | `--with-base` |

### strip-mode 详细说明

| 值 | 过滤内容 |
|------|------|
| `js` | `script`, `link[as=script]`, `link[rel=preload]` |
| `css` | `style`, `link[rel=stylesheet]` |
| `ui` | `img`, `picture`, `video`, `svg`, `style`, `link[rel=stylesheet]` |
| `full` | 组合 `js` + `ui` + `css` |

### wait-until 事件类型

| 事件 | 说明 |
|------|------|
| `load` | 页面完全加载 |
| `domcontentloaded` | DOM 解析完成 |
| `networkidle` | 网络空闲（适合 SPA） |
| `done` | 执行完成（默认） |

## 使用示例

### 基础用法

```bash
# 获取 Markdown 格式（AI 友好）
lightpanda fetch --dump markdown https://example.com

# 获取干净 HTML（去除 JS/CSS）
lightpanda fetch --dump html --strip-mode js,css https://example.com

# 获取语义树 JSON
lightpanda fetch --dump semantic_tree https://example.com

# 获取人类可读语义树
lightpanda fetch --dump semantic_tree_text https://example.com
```

### 处理 SPA/动态内容

```bash
# 等待动态内容加载
lightpanda fetch --dump markdown --wait-ms 10000 https://spa-example.com

# 等待网络空闲
lightpanda fetch --dump markdown --wait-until networkidle https://spa-example.com
```

### 包含 iframe

```bash
lightpanda fetch --dump markdown --with-frames https://example.com
```

### 使用代理

```bash
lightpanda fetch --dump markdown --http-proxy user:pass@proxy.example.com:8080 https://example.com
```

### 遵守 robots.txt

```bash
lightpanda fetch --dump markdown --obey-robots https://example.com
```

## semantic_tree 节点结构

JSON 输出包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `nodeId` | string | 唯一节点标识 |
| `backendDOMNodeId` | integer | 后端 DOM 节点 ID |
| `nodeName` | string | HTML 元素名（h1, p, a, text 等） |
| `xpath` | string | 节点 XPath 路径 |
| `nodeType` | integer | DOM 节点类型（1=元素, 3=文本, 9=文档） |
| `role` | string | ARIA 角色（heading, paragraph, link, none 等） |
| `name` | string | 计算的可访问名称 |
| `nodeValue` | string | 文本内容（仅文本节点） |
| `isInteractive` | boolean | 是否可交互元素 |
| `attributes` | object | HTML 属性（href, lang 等） |
| `children` | array | 子节点数组 |

### semantic_tree_text 输出格式

```
[1] RootWebArea 'Example Domain'
  [5] heading 'Example Domain'
  [6] paragraph
    [7] 'This domain is for use in documentation examples...'
  [8] paragraph
    [9] link 'Learn more'
```

## 典型应用场景

### 1. 分析页面结构

```bash
# 快速了解页面主要内容
lightpanda fetch --dump markdown https://example.com

# 深入分析 DOM 结构
lightpanda fetch --dump semantic_tree https://example.com | jq '.'
```

### 2. 提取可交互元素

```bash
# 提取所有链接
lightpanda fetch --dump semantic_tree https://example.com | jq '.. | objects | select(.role == "link")'

# 提取所有可交互元素
lightpanda fetch --dump semantic_tree https://example.com | jq '.. | objects | select(.isInteractive == true)'
```

### 3. 调试渲染问题

```bash
# 对比渲染前后
lightpanda fetch --dump html --strip-mode full https://example.com
```

### 4. AI/LLM 数据准备

```bash
# 获取干净的语义化内容
lightpanda fetch --dump markdown --strip-mode full https://example.com
```

## 与 webfetch 的区别

| 工具 | 适用场景 | 优势 |
|------|------|------|
| `lightpanda fetch` | 需要 JS 渲染的页面、页面结构分析 | 支持动态内容、多种输出格式 |
| `webfetch` | 静态页面、简单内容获取 | 无需额外工具、快速获取 |

**选择建议**：
- SPA 页面 → 使用 `lightpanda fetch`
- 需要分析页面结构 → 使用 `lightpanda fetch --dump semantic_tree`
- 快速获取静态内容 → 使用 `webfetch`
- AI/LLM 数据准备 → 使用 `lightpanda fetch --dump markdown`

## 参考文档

- Lightpanda 官方文档: https://lightpanda.io/docs/open-source/usage
- Markdown 和 AXTree: https://lightpanda.io/docs/open-source/guides/markdown-axtree