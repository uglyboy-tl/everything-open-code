---
description: 审核代码变更 [commit|branch|pr]，默认审核未提交的更改
agent: reviewer
subtask: true
---
<input>$ARGUMENTS</input>

## 确定审核范围
根据 `<input>` 内容判断审查类型：

1. **输入为空**：
   - 有未提交更改：审查未提交的更改（`git diff`、`git diff --cached`）
   - 无未提交更改：审查最近提交（`git show HEAD`）

2. **输入为 commit hash**（40位SHA或短哈希）：审查特定提交
   - `git show <input>`

3. **输入为分支名**：将当前分支与指定分支对比
   - `git diff <input>...HEAD`

4. **输入为 PR URL 或编号**（包含 "github.com" 或 "pull" 或数字）：
   - `gh pr view <input>` 获取 PR 上下文
   - `gh pr diff <input>` 获取 diff

5. **输入为具体描述**（非上述类型）：按描述要求进行针对性审查

## 获取上下文
**仅看 diff 不够。** 获取 diff 后，按需查看修改文件的完整内容便于理解上下文。
- 用 diff 识别改动的文件
- 用 `git status --short` 识别未跟踪文件，按需查看其完整内容
- 按需查看完整文件以理解现有模式、流程控制和错误处理


## 完成前确认
- 只审查变更的部分，不要审查未修改的原有代码

将完整的审查结果返回给用户。