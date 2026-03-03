# AGENTS.md - OpenCode 项目配置指南

## 项目概述
OpenCode 代理系统配置文件。包含可配合使用的代理、命令、技能、插件及其配套配置信息。

## 构建/测试/验证命令
### 项目初始化配置
- 在项目根目录创建 `.opencode` 文件夹
- 使用软链接将配置文件夹链接到项目本地：
  ```bash
  mkdir -p .opencode
  for dir in agents commands skills plugins; do
    ln -rsfn ./$dir .opencode/
  done
  ```
- 这样修改可以第一时间生效，覆盖全局设置

### 无需传统构建
- 项目主要由 Markdown 配置文件组成，无需编译或构建步骤

### 测试验证
- **无集成测试**：项目明确说明无需集成测试

## 项目配置规范

### 文件结构约定
- **agents/**: 包含各种代理的配置文件，每个代理一个 `.md` 文件
- **commands/**: 包含命令定义，每个命令一个 `.md` 文件
- **skills/**: 包含专业技能定义，每个技能一个目录
- **plugins/**: 包含插件配置文件
- **config/**: 包含全局配置文件

### 命名约定
- **文件命名**: 使用 kebab-case（小写加连字符）
  - 正确: `code-reviewer.md`, `git-commiter.md`
  - 错误: `CodeReviewer.md`, `git_committer.md`
- **目录命名**: 使用小写复数形式
  - 正确: `agents/`, `commands/`, `skills/`
- **变量/占位符**: 使用大写加下划线
  - 示例: `$ARGUMENTS`, `$INPUT`

### 最佳实践
- **DRY 原则**: 避免重复内容，使用引用和模板
- **明确性**: 规则和指令应尽可能明确具体
- **可维护性**: 结构应易于理解和修改
- **一致性**: 整个项目保持统一的风格和约定
- **指令遵从**: 配置文件作为 agent prompt，需确保指令清晰、可执行
- **Tokens 优化**: 避免明显冗余，但不过分优化影响可读性

### 语言和本地化
- **主要语言**: 中文（简体）
- **技术术语**: 保留英文技术术语，但用中文解释
- **混合内容**: 技术代码和命令保持英文，说明文字使用中文

### 参考文档
- **OpenCode 代理文档**: https://opencode.ai/docs/zh-cn/agents/
- **OpenCode 命令文档**: https://opencode.ai/docs/zh-cn/commands/
- **OpenCode 技能文档**: https://opencode.ai/docs/zh-cn/skills/
- **OpenCode 插件文档**: https://opencode.ai/docs/zh-cn/plugins/
- **OpenCode 工具文档**: https://opencode.ai/docs/zh-cn/tools/
- **OpenCode 规则文档**: https://opencode.ai/docs/zh-cn/rules/
- **OpenCode 配置文档**: https://opencode.ai/docs/zh-cn/config/