# CDP (Chrome DevTools Protocol) 浏览器操作

通过 CDP 直接操控 Lightpanda 浏览器，适用于需要渲染后内容、页面交互、结构分析等场景。

## 重要提示

**CDP Proxy 无法长期保持后台常驻，每次使用前需要重新启动服务。**

```bash
# 每次使用前启动服务
bun scripts/cdp.mjs

# 等待服务就绪（约 2-3 秒）
sleep 3

# 执行操作...
```

## 启动服务

```bash
# 启动 CDP 服务（自动启动 Lightpanda + HTTP Proxy）
bun scripts/cdp.mjs

# 服务地址
# - CDP Proxy: http://localhost:3456
# - Lightpanda: http://localhost:9222
```

服务会自动在后台运行，支持：
- 检测并复用已运行的服务
- 进程管理（PID 文件）
- 日志记录（`/tmp/lightpanda-cdp.log`）

## HTTP API

所有 API 通过 `http://localhost:3456` 访问：

### 页面管理

| API | 说明 |
|-----|------|
| `GET /health` | 健康检查 |
| `GET /targets` | 列出所有页面 |
| `GET /new?url=<url>` | 创建新页面并导航 |
| `GET /close?target=<id>` | 关闭页面 |

### 信息获取

| API | 说明 |
|-----|------|
| `GET /info?target=<id>` | 获取页面信息（title, url） |
| `GET /markdown?target=<id>` | 获取页面 Markdown 内容 |
| `GET /markdown?target=<id>&selector=<css>` | 获取指定区域的 Markdown |
| `GET /semantic-tree?target=<id>` | 获取语义树（简化版 JSON） |
| `GET /semantic-tree?target=<id>&full=1` | 获取语义树（完整版） |

### 页面操作

| API | 说明 |
|-----|------|
| `GET /navigate?target=<id>&url=<url>` | 导航到新 URL |
| `GET /back?target=<id>` | 后退 |
| `POST /eval?target=<id>` | 执行 JavaScript（body 或 expr 参数） |
| `POST /click?target=<id>` | 点击元素（body 为 CSS 选择器） |
| `GET /scroll?target=<id>&y=<px>&direction=<down|up|top|bottom>` | 滚动页面 |
| `GET /screenshot?target=<id>&format=png&file=<path>` | 截图 |

## 使用示例

```bash
# 创建页面
curl "http://localhost:3456/new?url=https://example.com"
# → {"targetId":"FID-0000000001"}

# 获取页面信息
curl "http://localhost:3456/info?target=FID-0000000001"
# → {"title":"Example Domain","url":"https://example.com/","ready":"complete"}

# 获取 Markdown
curl "http://localhost:3456/markdown?target=FID-0000000001"
# → {"markdown":"\n# Example Domain\n..."}

# 获取特定区域的 Markdown（避免冗余内容）
curl "http://localhost:3456/markdown?target=FID-0000000001&selector=article"
# → {"markdown":"文章内容..."}

curl "http://localhost:3456/markdown?target=FID-0000000001&selector=#content"
# → {"markdown":"指定 ID 元素内容..."}

# 执行 JavaScript
curl -X POST "http://localhost:3456/eval?target=FID-0000000001" -d 'document.title'
# → {"value":"Example Domain"}

# 关闭页面
curl "http://localhost:3456/close?target=FID-0000000001"
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LP_PORT` | 9222 | Lightpanda CDP 端口 |
| `LP_HOST` | 127.0.0.1 | Lightpanda 主机 |
| `CDP_PROXY_PORT` | 3456 | CDP Proxy 端口 |

## 运行测试

```bash
bun test skills/retrieve/tests/service.test.ts
```

测试覆盖：
1. 服务启动与端口检查
2. 服务复用（已运行时）
3. API 功能验证
4. 服务关闭

## 适用场景

- 需要获取 JavaScript 渲染后的页面内容
- 需要分析页面 DOM 结构
- 需要与页面交互（点击、滚动、填写表单）
- 需要获取语义化内容（Markdown、语义树）
- SPA 页面内容抓取

## 对比其他工具

| 工具 | 适用场景 | 特点 |
|------|----------|------|
| **CDP** | 动态页面、交互操作 | 完整浏览器能力、支持 JS 执行 |
| **lightpanda fetch** | 快速获取渲染后内容 | 命令行直接输出 Markdown/HTML |
| **webfetch** | 静态页面 | 无需额外工具、快速获取 |