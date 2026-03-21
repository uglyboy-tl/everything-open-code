---
description: 提交当前修改
agent: git-commiter
model: deepseek/deepseek-chat
subtask: true
---

用户指令: $ARGUMENTS

## 一、上下文收集（并行执行）

```bash
git status --porcelain
git diff --staged --stat
git diff --stat
git log -10 --pretty=format:"%s"
```

**提取关键信息：**
- 变更文件清单及状态
- 暂存区与工作区差异
- 最近提交风格（语言、格式偏好）

---

## 二、状态判断与处理

| 检查项 | 条件 | 处理策略 |
|--------|------|----------|
| **空仓库** | 无 `.git` 目录 | 提示"非 Git 仓库"，终止 |
| **无变更** | `git status` 为空 | 提示"无变更可提交"，终止 |
| **合并冲突** | 存在 `unmerged paths` | 提示"请先解决合并冲突"，终止 |

**暂存区保护原则**：
- 用户已暂存的文件视为明确意图，**不重置**
- 仅对工作区未暂存文件进行分析和建议

---

## 三、提交执行

### 情况 A：用户指令明确（$ARGUMENTS 非空）

直接使用用户指令作为 commit message：
```bash
git commit -m "$ARGUMENTS"
```

### 情况 B：用户指令为空，自动分析

**分组原则**：按功能单元原子化分组
- 同一功能/修复涉及的文件归为一组
- 配置文件、类型定义等基础变更单独提交
- 敏感信息（密钥、密码）必须排除

**执行循环**（直到所有变更提交完毕）：

1. **分析分组**：`git diff` 识别变更相关性
2. **暂存**：`git add <相关文件>`
3. **生成 message**：参考历史风格
4. **提交前确认**（关键检查）：
   - [ ] 变更属于单一功能单元？
   - [ ] 无调试代码（console.log、TODO）？
   - [ ] 无敏感信息泄露？
5. **提交**：`git commit -m "<type>: <description>"`

---

## 四、Commit Message 规范

**格式**：`type: description`

| 类型 | 用途 | 示例 |
|------|------|------|
| feat | 新功能 | `feat: add user authentication` |
| fix | 修复 bug | `fix: resolve login redirect loop` |
| refactor | 重构 | `refactor: extract validation logic` |
| docs | 文档 | `docs: update API reference` |
| style | 格式 | `style: format code with prettier` |
| test | 测试 | `test: add unit tests for utils` |
| chore | 杂项 | `chore: update dependencies` |

**描述要求**：
- 参考最近 10 条提交的语言风格（中文/英文）
- 动词开头，简洁明确
- 不超过 50 字符

---

## 五、异常处理

| 异常 | 处理方式 |
|------|----------|
| 暂存区冲突 | 提示具体文件，建议 `git mergetool` |
| pre-commit 失败 | 展示错误信息，不自动绕过 |
| 网络问题 | 本地提交成功，提示推送失败 |