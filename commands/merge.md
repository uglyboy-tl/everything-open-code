---
description: 将当前功能分支合并到 develop 分支
agent: build
model: deepseek/deepseek-chat
---

<input>$ARGUMENTS</input>

## 第一步：前置检查与信息收集

### 并行获取上下文

```bash
git status --porcelain
git rev-parse --abbrev-ref HEAD
git worktree list
pwd
git merge-base develop HEAD
git branch -r | grep develop
```

### 状态判断与处理

| 检查项 | 条件 | 处理策略 |
|--------|------|----------|
| **主分支保护** | 当前分支为 `main`/`master`/`develop` | 提示"不能从主分支执行合并操作"，终止 |
| **工作区隔离** | 当前目录不在 `.worktrees/` 下 | 提示"请在 worktree 目录下执行此命令"，终止 |
| **未提交更改** | `git status` 非空 | 自动调用 `/commit` 提交变更 |
| **远程分支缺失** | 本地 develop 不存在且无远程分支 | 从主干分支创建 develop |

**变量提取（供后续使用）：**
- `FEATURE_BRANCH`: 当前功能分支名
- `MERGE_BASE`: 功能分支与 develop 的共同祖先 commit
- `REPO_ROOT`: 主仓库根目录（从 worktree list 第一行获取）
- `DEVELOP_WORKTREE`: develop 分支对应的 worktree 路径（若存在）

---

## 第二步：准备 develop 分支

### 检查 develop worktree 是否存在

```
develop worktree 存在？
  ├─ 是 → 切换到 develop worktree 目录
  │
  └─ 否 → 在主仓库目录调用 `using-git-worktrees` 技能创建
           - 本地 develop 存在 → 直接 checkout
           - 本地不存在但有远程 → git checkout -b develop origin/develop
           - 均不存在 → git checkout -b develop <主分支>
```

### 同步远程

```bash
# 若 develop 跟踪远程分支
git pull origin develop --ff-only
```

**冲突处理**：
- 若 `--ff-only` 失败，说明本地有未推送的提交，提示用户手动处理后再执行合并

---

## 第三步：代码审核

执行审核命令：
```bash
/review <MERGE_BASE>..HEAD
```

### 审核结果判定

| 结果 | 含义 | 操作 |
|------|------|------|
| **Approve** | 通过审核 | 继续合并流程 |
| **Warning** | 有建议但不阻断 | 展示警告，询问用户是否继续 |
| **Block** | 发现阻断性问题 | 终止合并，展示问题并提供修复建议 |

---

## 第四步：执行合并

### 合并命令

```bash
git merge --no-ff -m "merge(${FEATURE_BRANCH}): 合并到 develop" ${FEATURE_BRANCH}
```

### 冲突检测与处理

| 场景 | 检测方式 | 处理策略 |
|------|----------|----------|
| **无冲突** | 退出码为 0 | 进入测试阶段 |
| **有冲突** | `git status` 含 `Unmerged paths` | 中止合并并提示解决步骤 |
| **合并中止** | 用户中断或其他错误 | 执行 `git merge --abort` 回滚 |

**冲突解决提示**：
```bash
# 查看冲突文件
git diff --name-only --diff-filter=U

# 解决后标记
git add <已解决文件>
git merge --continue
```

---

## 第五步：运行测试

### 测试判断

```
项目类型判断：
  ├─ 代码开发项目（有 package.json/pyproject.toml/Cargo.toml 等）
  │   └─ 分支功能与代码相关 → 执行完整测试套件
  │
  └─ 非代码项目或功能无关 → 跳过测试，提示用户
```

### 测试执行参考 AGENTS.md

**测试失败处理**：

| 失败类型 | 处理方案 |
|----------|----------|
| 单元测试失败 | 展示失败用例，询问用户：继续合并 / 回滚合并 |
| 集成测试失败 | 同上，额外提供 `git reset --hard HEAD~1` 回滚命令 |
| 测试超时 | 询问用户是否跳过测试继续合并 |

---

## 第六步：完成

### 成功输出

```
✅ 合并成功
- 功能分支: ${FEATURE_BRANCH}
- 目标分支: develop
- 测试状态: [通过/跳过]

下一步建议：
- 推送到远程: git push origin develop
- 清理功能分支: git branch -d ${FEATURE_BRANCH}
```

---

## 异常处理汇总

| 异常场景 | 处理方式 |
|----------|----------|
| 当前在主分支 | 终止，提示切换到功能分支 |
| 非 worktree 目录 | 终止，提示正确工作目录 |
| develop 同步失败 | 终止，提示手动处理远程冲突 |
| 审核阻断 | 终止，展示问题列表 |
| 合并冲突 | 中止合并，提供解决步骤 |
| 测试失败 | 询问用户：继续 / 回滚 |

---

## 完成前确认

- [ ] 已验证不在主分支上执行
- [ ] 已切换到 develop 分支的 worktree
- [ ] 代码审核已完成（Approve 或 Warning）
- [ ] 合并成功且无冲突残留
- [ ] 测试通过或用户确认跳过
- [ ] 向用户提供了明确的后续操作建议