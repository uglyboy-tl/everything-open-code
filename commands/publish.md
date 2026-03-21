---
description: 发布 develop 分支到主干并清理功能分支
agent: build
model: deepseek/deepseek-chat
---

## 发布流程

### 0. 前置条件检查
在执行前，首先确定主干分支名称：
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
```
- 若输出为 `main` 或 `master`，则使用该名称作为主干分支
- 若无输出，则询问用户确认主干分支名称

**为何关键**：不同项目的主干分支名称可能不同，动态确定可避免错误操作。

### 1. 环境验证与同步
并行执行以下命令收集状态信息：
```bash
# 状态验证
git worktree list              # 第一行为主仓库路径
pwd                            # 当前目录
git status --porcelain         # 检查工作区状态
git branch -a | grep develop   # 检查 develop 分支是否存在

# 同步远程
git fetch origin
```

**验证条件**（任一不满足则中止并说明原因）：
- [ ] 当前在主仓库目录（`pwd` 输出与 `git worktree list` 第一行匹配）
- [ ] 主干分支工作区干净（`git status --porcelain` 无输出）
- [ ] develop 分支存在（本地或远程）

**失败处理**：
- 不在主仓库 → 提示用户切换到正确目录
- 主干有未提交修改 → 提示用户先提交或暂存
- develop 不存在 → 询问用户是否需要创建

### 2. 信息收集与确认
环境验证通过后，收集发布所需信息：
```bash
# 收集待发布内容
git log --oneline <主干分支>..origin/develop  # develop 相比主干的提交

# 收集版本信息
git tag -l 'v*' --sort=-v:refname | head -5    # 最新5个版本标签

# 收集待清理分支
git branch --merged origin/develop | grep -v -E 'develop|<主干分支>|\*'
```

**确认发布内容**：
- 向用户展示待发布的提交列表
- 若无新提交，询问用户是否继续（可能是版本标签更新）
- 有新提交则展示提交数量和简要内容

**为何关键**：用户确认是避免误发布的重要安全措施。

### 3. 合并 develop 到主干
```bash
git merge --no-ff origin/develop -m "merge(develop): 合并到主分支"
```

**验证点**：
- 合并成功 → 继续下一步
- 合并冲突 → 中止流程，向用户说明冲突文件并提供解决建议

**失败处理**：
```
合并失败，检测到冲突：
- 冲突文件：<列出冲突文件>
- 建议：手动解决冲突后执行 `git commit` 完成合并
- 或执行 `git merge --abort` 放弃合并
```

### 4. 变基 develop 分支
切换到 develop worktree 并变基到主干：
```bash
# 从 worktree list 找到 develop 目录或使用技能创建
cd <develop-worktree-path>
git rebase <主干分支>
```

**验证点**：
- 变基成功 → 推送 develop 的变基结果
- 变基冲突 → 中止并提示用户手动解决

**失败处理**：
```
变基失败，需手动解决冲突：
- 执行 `git status` 查看冲突文件
- 解决后 `git rebase --continue` 继续
- 或 `git rebase --abort` 放弃变基
```

### 5. 确定版本标签
基于提交消息前缀分析变更类型并递增版本号：

| 提交前缀 | 变更类型 | 版本号递增 |
|---------|---------|-----------|
| `fix:` 或 `fix(` | Bug 修复 | 修订号 (0.0.x) |
| `feat:` 或 `feat(` | 新功能 | 次版本号 (0.x.0) |
| `BREAKING CHANGE` 或 `!:` | 重大变更 | 主版本号 (x.0.0) |
| 其他或混合 | 综合判断 | 按最高级别递增 |

**执行步骤**：
1. 从最新标签获取当前版本号
2. 根据提交列表分析变更类型
3. 计算新版本号并展示给用户确认
4. 用户确认后执行：`git tag -a <新版本号> -m "release: <新版本号>"`

**示例**：
```
当前版本：v1.2.3
检测到变更：
- feat: 添加用户认证功能
- fix: 修复登录验证问题
建议版本：v1.3.0（次版本号递增）
确认创建标签？[Y/n]
```

### 6. 推送更改
按顺序执行：
```bash
# 推送主干分支和标签
git push origin <主干分支>
git push origin <新版本号>

# 推送 develop 的变基结果（如有 develop worktree）
git push origin develop --force-with-lease
```

**验证点**：
- 推送失败（无权限/网络问题）→ 向用户说明并提供手动推送命令
- 强制推送失败（develop 有新提交）→ 提示用户先同步远程变更

### 7. 清理已合并功能分支
**安全确认**：展示已合并分支列表，询问用户确认后执行清理。

```bash
# 列出待清理分支
git branch --merged origin/develop | grep -v -E 'develop|<主干分支>|\*'

# 对每个确认的分支
git worktree remove <worktree-path>  # 删除 worktree
git branch -D <branch-name>          # 删除本地分支
git push origin --delete <branch-name>  # 删除远程分支（可选）
```

**为何关键**：清理操作不可逆，用户确认是必要的安全措施。

## 约束条件
- **原子性**：任何步骤失败都应中止流程，向用户说明原因和后续操作建议
- **可恢复性**：合并/变基失败时提供明确的回滚或恢复命令
- **用户确认**：版本标签、分支清理等关键操作前必须获得用户确认
- **信息透明**：每步操作都向用户展示关键信息，保持流程可观测性