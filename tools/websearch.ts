import { tool } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dirname, ".env")
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i === -1) continue
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim()
    if (k && v && !process.env[k]) process.env[k] = v
  }
}

const ENDPOINT = "https://api.anysearch.com/mcp"
const API_KEY_ENV = "ANYSEARCH_API_KEY"

export default tool({
  description: "Search the web using AnySearch engine. Supports general web search and domain-specific vertical search (finance, code, social_media, etc.)",
  args: {
    query: tool.schema.string().describe("The search query"),
    maxResults: tool.schema.number().optional().describe("Number of results to return (1-10, default 10)"),
  },
  async execute(args, context) {
    const apiKey = process.env[API_KEY_ENV]
    if (!apiKey) return "Error: ANYSEARCH_API_KEY environment variable is not set"

    const maxResults = Math.min(args.maxResults ?? 8, 10)
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "search",
        arguments: { query: args.query, max_results: maxResults },
      },
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    })

    const json = await res.json()
    if (!res.ok) return `Error: HTTP ${res.status}: ${JSON.stringify(json)}`
    if (json.error) return `Error: ${json.error.message || JSON.stringify(json.error)}`

    const content = json.result?.content
    if (Array.isArray(content)) {
      const textItem = content.find(c => c.type === "text")
      if (textItem) return textItem.text
    }
    return JSON.stringify(json.result || json, null, 2)
  },
})
