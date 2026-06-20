import { tool } from "@opencode-ai/plugin"
import { $ } from "bun"
import path from "path"

const script = path.join(
  "/home/uglyboy/.local/share/dotfiles/config/opencode/skills/anysearch/scripts",
  "anysearch_cli.sh",
)

export default tool({
  description: "Search the web using AnySearch engine. Supports general web search and domain-specific vertical search (finance, code, social_media, etc.)",
  args: {
    query: tool.schema.string().describe("The search query"),
    maxResults: tool.schema.number().optional().describe("Number of results to return (1-10, default 10)"),
  },
  async execute(args, context) {
    const maxResults = args.maxResults ?? 8
    const result = await $`bash ${script} search ${args.query} --max_results ${maxResults}`.text()
    return result.trim()
  },
})
