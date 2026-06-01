# GitHub CLI (gh) 详细用法

所有 GitHub 相关检索都使用 `gh` 命令，不使用 webfetch（网络稳定性问题）。

## Issue 搜索

```bash
# 搜索仓库内的 issues
gh issue list --repo OWNER/REPO --search "关键词" --state all

# 搜索已关闭的 issues
gh issue list --repo OWNER/REPO --search "error" --state closed

# 按标签筛选
gh issue list --repo OWNER/REPO --label "bug"

# 查看 issue 详情
gh issue view ISSUE_NUMBER --repo OWNER/REPO

# 查看 issue 评论
gh issue view ISSUE_NUMBER --repo OWNER/REPO --comments
```

**常用参数**：
- `--state all` / `--state open` / `--state closed`
- `--label LABEL` 按标签过滤
- `--limit N` 限制结果数量
- `--search "关键词"` 搜索关键词

## 代码搜索

```bash
# 全局代码搜索
gh search code "function name" --language typescript

# 限定仓库搜索
gh search code "error message" --repo OWNER/REPO

# 限定文件类型
gh search code "className" --extension ts --extension tsx

# 限定语言
gh search code "useEffect" --language javascript

# 排除某些文件
gh search code "test" --extension go --exclude-extension _test.go
```

**常用参数**：
- `--repo OWNER/REPO` 限定仓库
- `--language LANG` 限定语言
- `--extension EXT` 限定文件扩展名
- `--exclude-extension EXT` 排除扩展名

## PR 搜索

```bash
# 搜索仓库内的 PRs
gh pr list --repo OWNER/REPO --search "feature" --state all

# 查看已合并的 PRs
gh pr list --repo OWNER/REPO --state merged

# 查看 PR 详情
gh pr view PR_NUMBER --repo OWNER/REPO

# 查看 PR 文件变更
gh pr view PR_NUMBER --repo OWNER/REPO --json files

# 查看 PR diff
gh pr diff PR_NUMBER --repo OWNER/REPO

# 查看 PR 评论
gh pr view PR_NUMBER --repo OWNER/REPO --comments
```

**常用参数**：
- `--state all` / `--state open` / `--state closed` / `--state merged`
- `--search "关键词"` 搜索关键词
- `--json FIELD` 输出 JSON 格式指定字段
- `--limit N` 限制结果数量

## Discussion 搜索

```bash
# 搜索 Discussions
gh search discussions "question" --repo OWNER/REPO

# 查看特定 discussion
gh api repos/OWNER/REPO/discussions/DISCUSSION_NUMBER
```

## 仓库信息查询

```bash
# 查看仓库概览
gh repo view OWNER/REPO

# 查看仓库 README
gh repo view OWNER/REPO --json readme --jq .readme

# 列出仓库文件
gh api repos/OWNER/REPO/contents

# 查看仓库 releases
gh release list --repo OWNER/REPO

# 查看特定 release
gh release view TAG_NAME --repo OWNER/REPO

# 查看仓库 contributors
gh api repos/OWNER/REPO/contributors

# 查看仓库 stats
gh api repos/OWNER/REPO/stats/participation
```

## 高级用法

### JSON 输出与 jq 处理

```bash
# 输出 JSON 格式
gh issue list --repo OWNER/REPO --json number,title,state

# 用 jq 过滤和处理
gh issue list --repo OWNER/REPO --json number,title,labels --jq '.[] | select(.labels[].name == "bug")'

# 获取 issue 标题列表
gh issue list --repo OWNER/REPO --json title --jq '.[].title'
```

### 批量操作

```bash
# 批量查看多个 issue
gh issue view 1 2 3 --repo OWNER/REPO

# 批量关闭 issues（需要确认）
gh issue close 1 2 3 --repo OWNER/REPO
```

### API 直接调用

```bash
# 获取仓库信息
gh api repos/OWNER/REPO

# 获取 issue 列表（带分页）
gh api repos/OWNER/REPO/issues --paginate

# 获取特定 commit
gh api repos/OWNER/REPO/commits/SHA

# 获取分支列表
gh api repos/OWNER/REPO/branches
```

## 使用示例

### 调试构建错误

```bash
# 查 Next.js 特定项目的构建错误
gh issue list --repo vercel/next.js --search "build error EACCES" --state all

# 全局搜索某个错误信息
gh search code "TypeError: Cannot read property 'map' of undefined"

# 查看某版本相关的 issues
gh issue list --repo facebook/react --search "18.2" --state all
```

### 查找功能实现

```bash
# 查找仓库中特定功能的实现
gh search code "useEffect" --repo facebook/react --extension ts

# 查看某个 API 的使用方式
gh search code "createStore" --repo pmndrs/zustand --extension ts
```

### 调研项目

```bash
# 查看仓库概览
gh repo view pmndrs/zustand

# 查看开放问题
gh issue list --repo pmndrs/zustand --state open --limit 20

# 查看最近合并的 PRs
gh pr list --repo pmndrs/zustand --state merged --limit 10

# 查看 README
gh repo view pmndrs/zustand --json readme --jq .readme
```

### 查看 PR 变更

```bash
# 查看 PR 的文件变更
gh pr view 12345 --repo vercel/next.js --json files

# 查看 PR diff
gh pr diff 12345 --repo vercel/next.js

# 查看 PR 审查状态
gh pr view 12345 --repo vercel/next.js --json reviews
```

## 参考文档

- GitHub CLI 官方文档: https://cli.github.com/manual/
- gh issue 命令: https://cli.github.com/manual/gh_issue
- gh pr 命令: https://cli.github.com/manual/gh_pr
- gh search 命令: https://cli.github.com/manual/gh_search
- gh repo 命令: https://cli.github.com/manual/gh_repo
- gh api 命令: https://cli.github.com/manual/gh_api