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

2. **确定检索场景** → 匹配下表选择工具：

| 场景 | 首选工具 | 命令模板 |
|------|----------|----------|
| 技术概念/原理调研 | Exa | `scripts/retrieve exa -t neural "query"` |
| 快速事实查询 | Exa | `scripts/retrieve exa -t fast "query"` |
| 学术论文/研究 | Exa | `scripts/retrieve exa -c "research paper" "query"` |
| 项目报错调试（已知项目） | GitHub | `scripts/retrieve github --repo OWNER/REPO "error"` |
| 精确错误匹配 | GitHub | `scripts/retrieve github --exact "error msg"` |
| 编程问答/代码片段 | Stack Overflow | `scripts/retrieve stackoverflow -t "lang" "query"` |
| 技术趋势/社区讨论 | Hacker News | `scripts/retrieve hackernews -p pastweek "query"` |

3. **获取全文** → 搜索结果返回 URL 列表
   - 如需详细内容 → 用 `scripts/retrieve fetch URL` 获取

## 二、工具详解

### Exa AI（默认首选）

**为何首选**：语义理解查询意图、全网覆盖、结果质量高。

```bash
scripts/retrieve exa [-t TYPE] [-c CATEGORY] "query"
```

| 参数 | 可选值 | 用途 |
|------|--------|------|
| `-t TYPE` | `neural`（默认，语义匹配）<br>`keyword`（精确关键词）<br>`fast`（快速返回）<br>`deep`（深度分析） | 控制搜索模式 |
| `-c CATEGORY` | `research paper`<br>`news`<br>`company`<br>`people`<br>`personal site` | 限定数据类别 |

**使用示例**：
```bash
# 理解 React Hooks 原理
scripts/retrieve exa -t neural "React Hooks internals deep dive"

# 查找最新 Rust 异步编程研究
scripts/retrieve exa -c "research paper" "Rust async programming patterns"
```

---

### GitHub Issues

**适用场景**：项目级错误调试、已知 issue 查找、版本兼容问题。

```bash
scripts/retrieve github [--repo OWNER/REPO] [--exact MSG] [--version V] [--closed] "query"
```

| 参数 | 用途 |
|------|------|
| `--repo OWNER/REPO` | 限定仓库范围（强烈推荐） |
| `--exact "error msg"` | 精确匹配错误消息 |
| `--version V` | 限定版本号 |
| `--closed` | 包含已关闭的 issues |

**使用示例**：
```bash
# 查 Next.js 特定项目的构建错误
scripts/retrieve github --repo vercel/next.js "build error EACCES"

# 精确匹配某个错误
scripts/retrieve github --exact "TypeError: Cannot read property 'map' of undefined"

# 查看某版本的已知问题
scripts/retrieve github --repo facebook/react --version 18.2 "useEffect cleanup"
```

---

### Stack Overflow

**适用场景**：编程问答、代码示例、语言/框架特定问题。

```bash
scripts/retrieve stackoverflow [-t "tag1;tag2"] "query"
```

**使用示例**：
```bash
# Python 相关问题
scripts/retrieve stackoverflow -t "python;pandas" "merge dataframes with different columns"

# React Hooks 问题
scripts/retrieve stackoverflow -t "reactjs;hooks" "useEffect dependency array"
```

---

### Hacker News

**适用场景**：技术趋势、新工具发现、社区讨论。

```bash
scripts/retrieve hackernews [-t TAG] [-p PERIOD] "query"
```

| 参数 | 可选值 |
|------|--------|
| `-t TAG` | `story`（文章）<br>`show_hn`（展示项目）<br>`ask_hn`（提问）<br>`comment`（评论） |
| `-p PERIOD` | `last24h`<br>`pastweek`<br>`pastmonth`<br>`all` |

**使用示例**：
```bash
# 最近一周 AI 编程工具讨论
scripts/retrieve hackernews -t story -p pastweek "AI coding assistant"

# 查看社区对新技术的评价
scripts/retrieve hackernews -t comment "Rust vs Go performance"
```

---

### 网页获取（fetch）

**必须调用场景**：搜索命令返回 URL 列表后，需要获取具体页面内容。

```bash
scripts/retrieve fetch URL
```

## 三、典型工作流

### 学习新技术
```
步骤 1: exa 概览原理 → 获得教程/文档 URL
步骤 2: fetch 优质教程 → 深入理解
步骤 3: hackernews 查社区讨论 → 了解实践经验
```
**示例**：学习 WebAssembly
```bash
scripts/retrieve exa -t neural "WebAssembly introduction tutorial"
scripts/retrieve fetch "https://webassembly.org/docs/getting-started/"
scripts/retrieve hackernews -p pastmonth "WebAssembly production experience"
```

### 调试错误
```
步骤 1: github --repo 查项目 issues → 找已知问题
步骤 2: stackoverflow 查问答 → 找解决方案
步骤 3: exa 广泛搜索 → 扩展思路
步骤 4: fetch 相关页面 → 获取详细解释
```
**示例**：调试 Next.js 构建错误
```bash
scripts/retrieve github --repo vercel/next.js --closed "Module not found"
scripts/retrieve stackoverflow -t "next.js;webpack" "Module not found build error"
scripts/retrieve exa -t neural "Next.js webpack module resolution troubleshooting"
```

### 技术选型
```
步骤 1: exa 对比分析 → 获得对比文章
步骤 2: hackernews 社区讨论 → 了解真实体验
步骤 3: github issues 查已知问题 → 评估风险
步骤 4: fetch 官方文档 → 确认特性
```
**示例**：选择状态管理库（Zustand vs Jotai）
```bash
scripts/retrieve exa -t neural "Zustand vs Jotai comparison 2024"
scripts/retrieve hackernews -p pastweek "Zustand Jotai experience"
scripts/retrieve github --repo pmndrs/zustand "performance"
scripts/retrieve fetch "https://zustand-demo.pmnd.rs/"
```

## 四、执行规则

**强制执行**：
- 本地能回答的问题，禁止调用网络检索
- 不确定用哪个工具时，默认用 `exa -t neural`
- 所有搜索结果为 URL 列表，如需全文必须调用 `fetch`
- 关键决策信息必须交叉验证（至少 2 个来源）

**禁止行为**：
- 跳过本地文档直接搜索
- 信任单一来源的关键决策
- 对 `fetch` 结果添加原文不存在的内容

## 五、依赖检查

脚本运行失败时检查：

| 依赖 | 用途 | 命令子项 |
|------|------|----------|
| `curl`, `jq` | HTTP 请求、JSON 解析 | 所有命令 |
| `gh` (GitHub CLI) | GitHub API 调用 | `github` |
| `EXA_API_KEY` | Exa AI 认证 | `exa` |

**验证方式**：
```bash
# 检查 curl
which curl && curl --version

# 检查 GitHub CLI
which gh && gh auth status

# 检查 Exa API Key
echo $EXA_API_KEY
```