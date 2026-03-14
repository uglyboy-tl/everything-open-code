---
name: retrieve
description: 当需要网络搜索时使用。适用于：实时信息、事实性查询、本地代码库无法解答的问题、技术文档、调试错误、技术调研。
---

# 信息检索

## 核心原则

**Exa 优先、专项补充、按需深入。**

## 重要说明

**搜索结果为 URL 列表，需用 `fetch` 获取具体内容：**
```
搜索(exa/github/stackoverflow/hackernews) → 获得 URL 列表 → fetch URL 获取全文
```

## 快速选择

| 需求 | 命令 | 说明 |
|------|------|------|
| 技术概念/调研 | `exa -t neural` | 首选：语义理解，覆盖全面 |
| 快速事实 | `exa -t fast` | 快速返回答案 |
| 学术论文 | `exa -c "research paper"` | 学术资源 |
| 项目错误调试 | `github --repo OWNER/REPO` | 项目特定问题 |
| 精确错误匹配 | `github --exact "error msg"` | 精确匹配错误 |
| 编程问答/代码 | `stackoverflow -t lang` | 专注编程问答 |
| 技术趋势 | `hackernews -p pastweek` | 社区热点 |
| 获取网页全文 | `fetch URL` | 获取搜索结果的具体内容 |

## Exa AI（首选）
```bash
scripts/retrieve exa [-t TYPE] [-c CATEGORY] "query"
```

**搜索类型：** `neural`(语义,推荐) | `keyword`(精确) | `fast`(快速) | `deep`(深度)
**数据类别：** `research paper` | `news` | `company` | `people` | `personal site`
**为何首选：** 语义理解查询意图、全网覆盖、结果质量高。

## GitHub Issues
**适用场景：** 项目级错误调试、已知 issue 查找、版本兼容问题。
```bash
scripts/retrieve github [--repo OWNER/REPO] [--exact MSG] [--version V] [--closed] "query"
```

**关键选项：**
- `--repo`: 限定仓库范围
- `--exact`: 精确匹配错误消息
- `--closed`: 包含已关闭 issues

## Stack Overflow
**适用场景：** 编程问答、代码示例、语言/框架问题。
```bash
scripts/retrieve stackoverflow [-t TAGS] "query"
```

**选项：** `-t "tag1;tag2"` 按标签过滤

## Hacker News
**适用场景：** 技术趋势、新工具发现、社区讨论。
```bash
scripts/retrieve hackernews [-t TAG] [-p PERIOD] "query"
```

**标签：** `story` | `show_hn` | `ask_hn` | `comment`
**时间：** `last24h` | `pastweek` | `pastmonth` | `all`

## 网页获取
```bash
scripts/retrieve fetch URL
```
**用途：** 获取搜索结果中的具体页面内容。所有搜索命令返回 URL 列表，需用此命令获取全文。

## 工作流

**学习新技术：**
```
exa 概览 → hackernews 趋势 → fetch 文档
```

**调试错误：**
```
github --repo 项目issue → stackoverflow 问答 → exa 广泛搜索 → fetch 相关页面
```

**技术选型：**
```
exa 对比分析 → hackernews 讨论 → github issues 已知问题 → fetch 详细文档
```

## 注意事项

**始终：**
- 简单检索优先用 Exa
- 交叉验证重要信息
- 验证信息时效性
- 搜索结果按需用 fetch 获取全文

**绝不：**
- 忽视本地文档直接网络搜索
- 信任单一来源的关键决策信息

## 依赖（脚本运行失败时可以检查）
- `curl`, `jq`: HTTP 和 JSON 处理
- `gh`: GitHub CLI（github 子命令）
- `EXA_API_KEY`: Exa AI 密钥（exa 子命令）
