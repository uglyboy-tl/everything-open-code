---
name: image-gen
description: AI image generation via bash script. Use when user asks to generate, create, draw, or edit images.
---

# Image Generation (Imagine)

基于 bash 脚本的 AI 图像生成工具，支持 7 家提供商。

> **脚本**: `{baseDir}/scripts/imagine`
> **默认**: `doubao`（不传 `--provider` 即为默认；若传了 `--ref` 则自动切换为 `doubao`）
> **环境变量**: 从当前环境读取（`set -a; source scripts/.env; set +a` 或 `export` 均可）

---

## 用法

```bash
bash {baseDir}/scripts/imagine -p "<提示词>" -o <输出.png> [选项]
```

### 选项

| 选项 | 描述 | 适用 |
|------|------|------|
| `-p, --prompt <text>` | 提示词 | 全部 |
| `-P, --promptfile <file>` | 从文件读取提示词 | 全部 |
| `-o, --output <path>` | 输出路径（自动生成文件名） | 全部 |
| `--provider <name>` | 服务提供商 **（不传=自动: doubao, 有ref→doubao）** | `openai` `google` `dashscope` `zai` `minimax` `doubao` `agnes` |
| `-m, --model <id>` | 模型 ID（覆盖默认） | 全部 |
| `--ar <ratio>` | 宽高比（参考下表） | 全部 |
| `-s, --size <WxH>` | 显式尺寸（如 `1792x1024`） | 全部 |
| `-q, --quality <preset>` | `standard` / `hd` | `openai` |
| `-n, --count <num>` | 生成数量（默认 1） | 全部（minimax ≤ 9） |
| `--seed <num>` | 随机种子（复现用） | `dashscope` `doubao` |
| `--negative-prompt <text>` | 排除元素 | `dashscope` `doubao` |
| `--ref <path>` | 参考图路径（支持 jpg/png/webp，多个用逗号分隔） | `agnes` `google` `dashscope` `minimax` `doubao` |
| `--style <style>` | `vivid` / `natural` | `openai` |

### 子命令

| 命令 | 用途 |
|------|------|
| `models` | 列出已配置密钥的可用提供商 |
| `models <提供商>` | 查看指定提供商的可用模型 |
| `-v, --version` | 显示版本信息 |

---

## 示例

```bash
# 默认 doubao（无需 --provider）
bash {baseDir}/scripts/imagine -p "雨后的西湖，荷花上的水珠，晨雾" -o westlake.png --ar 16:9

# 指定 google
bash {baseDir}/scripts/imagine -p "Close-up of a wrinkled farmer face, golden hour light" -o farmer.png --provider google --ar 4:3

# 指定 zai
bash {baseDir}/scripts/imagine -p "赛博朋克女武士，霓虹灯雨夜" -o samurai.png --provider zai --ar 9:16

# 指定 minimax 批量生成
bash {baseDir}/scripts/imagine -p "极简线条风格 LOGO，字母 A 的抽象" -o logo.png --provider minimax -n 4

# 参考图生成（默认 doubao）
bash {baseDir}/scripts/imagine -p "把背景换成樱花" -o ref-output.png --ref source.png

# 参考图 + 多张 + 指定提供商
bash {baseDir}/scripts/imagine -p "不同的配色方案" -o variants.png --ref char.png,style.png --provider minimax -n 3
```

---

## 宽高比参考

| 比例 | 尺寸 | 推荐用途 |
|------|------|----------|
| `1:1` | `1024x1024` | 头像、正方形配图 |
| `16:9` | `1792x1024` | 横屏壁纸、Banner |
| `9:16` | `1024x1792` | 竖屏壁纸、手机壁纸 |
| `4:3` | `1408x1056` | 演示文稿、插图 |
| `3:4` | `1056x1408` | 海报、卡片 |
| `2.35:1` | `2048x872` | 宽银幕电影感 |

---

## 环境变量

> 配置可集中存放于 `{baseDir}/scripts/.env`（已在 `.gitignore` 中），运行前执行 `set -a; source {baseDir}/scripts/.env; set +a`；或直接在 shell 中 `export`

| 变量 | 对应提供商 |
|------|-----------|
| `DASHSCOPE_API_KEY` | `dashscope` |
| `GOOGLE_API_KEY` | `google` |
| `MINIMAX_API_KEY` | `minimax` |
| `ARK_API_KEY` | `doubao` |
| `OPENAI_API_KEY` | `openai` |
| `ZAI_API_KEY` | `zai` |
| `AGNES_API_KEY` | `agnes` |

> `XGET_BASE_URL` 已配置代理地址，无需额外设置。

---

## 错误处理

**密钥缺失:**
```
ERROR: DASHSCOPE_API_KEY not set - add to .env or export it
```
→ 编辑 `{baseDir}/scripts/.env` 后 `source` 重试，或直接 `export <变量>=<值>` 后重试。

**生成失败:**
1. 尝试同提供商的其他模型（如 `qwen-image-plus` → `wanx`）
2. 切换到其他提供商降级
3. 检查提示词是否含敏感内容

**已知限制:**
- OpenAI GPT Image: `-n` 只能为 1；不支持 `--ref`
- MiniMax: `-n` 最大 9
- Google Imagen: 返回 base64（脚本自动解码）
- `--ref` 支持格式: jpg/jpeg, png, webp；多个用逗号分隔
- `--ref` 支持的提供商: `doubao`（默认）、`agnes`、`google`、`dashscope`、`minimax`；`openai` 和 `zai` 不支持
- 带 `--ref` 时各提供商自动选用: `doubao`→`doubao-seedream-5-0-260128`、`agnes`→`agnes-image-2.1-flash`、`google`→`gemini-2.5-flash-image`、`dashscope`→`wan2.7-image-pro`、`minimax`→`image-01`
