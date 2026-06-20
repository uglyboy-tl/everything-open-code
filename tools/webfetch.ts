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
  description: "Fetches content from a specified URL using AnySearch engine. Returns content as markdown (anysearch extract output is markdown-only).",
  args: {
    url: tool.schema.string().describe("The URL to fetch content from"),
    format: tool.schema.string().optional().describe("Ignored — anysearch extract always returns markdown. Accepted for interface compatibility."),
    timeout: tool.schema.number().optional().describe("Timeout in seconds (max 120, default 30)"),
  },
  async execute(args, context) {
    const apiKey = process.env[API_KEY_ENV]
    if (!apiKey) return "Error: ANYSEARCH_API_KEY environment variable is not set"

    const timeout = Math.min(args.timeout ?? 30, 120) * 1000
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "extract",
        arguments: { url: args.url },
      },
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeout),
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
