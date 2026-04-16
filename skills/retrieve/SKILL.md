---
name: retrieve
description: 当需要网络搜索时使用。适用于：实时信息、事实性查询、本地代码库无法解答的问题、技术文档、调试错误、技术调研。
---

# 信息检索技能

## 一、决策流程

**按以下顺序判断：**

1. **先检查本地** → 本地代码库/文档能否回答？
   - ✅ 能 → 直接回答，无需网络检索
   - ❌ 不能 → 进入步骤 2

2. **确定检索目标** → 选择工具：

   | 目标 | 首选工具 |
   |------|----------|
   | 通用网络搜索、技术概念 | `exa` |
   | GitHub Issue/PR/代码 | `gh` 命令 |
   | Stack Overflow 问答 | `stackoverflow` |
   | Hacker News 技术讨论 | `hackernews` |
   | 静态网页内容 | `webfetch` |
   | 动态/SPA 页面内容 | `lightpanda fetch` 或 `CDP` |

3. **执行检索** → 见下文「二、工具详解」

**注意**：如果找不到 `scripts/retrieve` 脚本，请使用完整路径 `$HOME/.config/opencode/skills/retrieve/scripts/retrieve`

---

## 二、工具详解

### 1. Exa AI（通用网络搜索）

**何时使用**：技术概念调研、文档搜索、趋势分析、事实查询。

```bash
# 语法
scripts/retrieve exa [-t TYPE] [-c CATEGORY] [-n LIMIT] "query"

# 示例
scripts/retrieve exa -t neural "React Hooks internals deep dive"
scripts/retrieve exa -c "research paper" "Rust async programming patterns"
scripts/retrieve exa -t fast "Node.js 20 new features"
```

| 参数 | 说明 | 常用值 |
|------|------|--------|
| `-t TYPE` | 搜索类型 | `neural`（语义，默认）、`keyword`（精确）、`fast`（快速） |
| `-c CATEGORY` | 数据类别 | `research paper`、`news`、`company`、`personal site` |
| `-n LIMIT` | 结果数量 | 默认 10，最大 100 |

---

### 2. GitHub（使用 gh 命令）

**重要**：所有 GitHub 相关检索必须使用 `gh` 命令，禁止使用 webfetch。

```bash
# Issue 搜索
gh issue list --repo OWNER/REPO --search "关键词" --state all
gh issue view ISSUE_NUMBER --repo OWNER/REPO --comments

# 代码搜索
gh search code "error message" --repo OWNER/REPO --language typescript

# PR 搜索
gh pr list --repo OWNER/REPO --state merged
gh pr view PR_NUMBER --repo OWNER/REPO --json files

# 仓库信息
gh repo view OWNER/REPO
gh release list --repo OWNER/REPO
```

> 详细用法见 `reference/github.md`

---

### 3. Stack Overflow（编程问答）

```bash
# 搜索技术问题
scripts/retrieve stackoverflow [-t "tag1;tag2"] [-n LIMIT] "query"

# 示例
scripts/retrieve stackoverflow -t "python;pandas" "merge dataframes"
scripts/retrieve stackoverflow -t "reactjs" "useEffect dependency array"
```

---

### 4. Hacker News（技术趋势）

```bash
# 搜索技术讨论
scripts/retrieve hackernews [-t TAG] [-p PERIOD] [-n LIMIT] "query"

# 示例
scripts/retrieve hackernews -t story -p pastweek "AI coding"
scripts/retrieve hackernews -t comment "Rust vs Go"
```

| 参数 | 说明 | 常用值 |
|------|------|--------|
| `-t TAG` | 内容类型 | `story`、`comment`、`show_hn`、`ask_hn` |
| `-p PERIOD` | 时间范围 | `last24h`、`pastweek`、`pastmonth` |

---

### 5. Webfetch（静态页面）

**何时使用**：获取不需要 JavaScript 渲染的静态页面内容。

**使用方式**：直接使用 OpenCode 内置的 webfetch 工具，传入 URL 即可获取内容。

**重要规则**：
- ✅ 非 GitHub 静态页面 → webfetch
- ❌ GitHub 页面 → 必须使用 `gh` 命令
- ❌ 需要 JS 渲染的页面 → 使用 lightpanda 或 CDP

---

### 6. Lightpanda（动态页面）

**何时使用**：需要 JavaScript 渲染的 SPA 页面、获取渲染后的内容。

```bash
# 获取 Markdown（AI 友好）
lightpanda fetch --dump markdown https://example.com

# 等待动态内容加载
lightpanda fetch --dump markdown --wait-until networkidle https://spa.example.com

# 获取语义树（结构化数据）
lightpanda fetch --dump semantic_tree https://example.com

# 提取可交互元素
lightpanda fetch --dump semantic_tree https://example.com | jq '.. | objects | select(.isInteractive == true)'
```

> 详细用法见 `reference/lightpanda.md`

---

### 7. CDP（轻量浏览器交互）

**何时使用**：需要与页面交互（点击、滚动、填表）、执行 JavaScript。

```bash
# 启动服务（每次使用前需重新启动）
bun scripts/cdp.mjs

# 创建页面
curl "http://localhost:3456/new?url=https://example.com"
# → {"targetId":"FID-0000000001"}

# 获取内容
curl "http://localhost:3456/markdown?target=FID-0000000001"

# 执行 JS
curl -X POST "http://localhost:3456/eval?target=FID-0000000001" -d 'document.title'

# 交互操作
curl -X POST "http://localhost:3456/click?target=FID-0000000001" -d '.button-class'
```

> 详细用法见 `reference/cdp.md`

---

## 三、典型工作流

### 调试错误
```
步骤 1: gh search code    → 找相似代码
步骤 2: gh issue list    → 找已知问题
步骤 3: stackoverflow   → 找解决方案
步骤 4: exa              → 扩展思路
```

```bash
# 示例：调试 Next.js 构建错误
gh search code "Module not found" --repo vercel/next.js
gh issue list --repo vercel/next.js --search "Module not found" --state closed
scripts/retrieve stackoverflow -t "next.js;webpack" "Module not found"
scripts/retrieve exa -t neural "Next.js webpack troubleshooting"
```

### 学习新技术
```
步骤 1: exa 概览        → 获得教程/文档 URL
步骤 2: webfetch 获取   → 深入理解
步骤 3: hackernews      → 了解实践经验
```

### 分析 SPA 页面
```
步骤 1: lightpanda markdown    → 快速了解内容
步骤 2: lightpanda semantic_tree → 分析结构
步骤 3: CDP 交互（如需要）    → 执行操作
```

### 调研 GitHub 项目
```
步骤 1: gh repo view     → 仓库概览
步骤 2: gh issue list   → 开放问题
步骤 3: gh pr list      → 最近变更
步骤 4: gh search code  → 关键实现
```

---

## 四、执行规则

**强制执行**：
1. 本地能回答的问题，禁止调用网络检索
2. 不确定用哪个工具时，默认用 `exa -t neural`
3. GitHub 相关检索必须使用 `gh` 命令
4. 静态页面用 `webfetch`，动态页面用 `lightpanda`
5. 关键决策信息必须交叉验证（至少 2 个来源）

**禁止行为**：
1. 跳过本地文档直接搜索
2. 对 GitHub.com 链接使用 webfetch
3. 对需要 JS 渲染的页面使用 webfetch
4. 信任单一来源的关键决策

---

## 五、依赖检查

| 依赖 | 用途 | 检查命令 |
|------|------|----------|
| `curl`, `jq` | HTTP 请求、JSON 解析 | `which curl && which jq` |
| `gh` | GitHub CLI | `which gh && gh auth status` |
| `lightpanda` | 动态页面 | `which lightpanda` |
| `bun` | 运行 CDP 脚本 | `which bun` |
| `EXA_API_KEY` | Exa AI 认证 | `echo $EXA_API_KEY` |

**未安装时**：
```bash
# 安装 Lightpanda
curl -sL https://github.com/lightpanda-io/browser/releases/latest/download/install.sh | bash
```

---

## 参考文档

- `reference/github.md` - GitHub 命令详解
- `reference/lightpanda.md` - Lightpanda CLI 详解
- `reference/cdp.md` - CDP HTTP API 详解