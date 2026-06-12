/**
 * memory-context for OpenCode
 *
 * Injects session memory files (checkpoint, MEMORY.md, notes) into the
 * compaction context so the agent retains state across context resets.
 *
 * Uses the `experimental.session.compacting` hook to inject memory content
 * when the context window is being compressed.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

const MEMORY_ROOT = ".opencode/memory"

async function readFileSize(filePath: string, maxBytes: number): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    if (content.length > maxBytes) {
      return content.slice(0, maxBytes) + "\n... (truncated)"
    }
    return content
  } catch {
    return ""
  }
}

export const MemoryContextPlugin: Plugin = async ({ directory }) => {
  return {
    "experimental.session.compacting": async (input, output) => {
      const sessionId = input.sessionID
      const memoryDir = path.join(directory, MEMORY_ROOT)
      const sessionDir = path.join(memoryDir, "sessions", sessionId)

      const sections: string[] = []

      // 1. Project memory (MEMORY.md) - always include
      const memoryPath = path.join(memoryDir, "MEMORY.md")
      const memoryContent = await readFileSize(memoryPath, 25000)
      if (memoryContent.trim()) {
        sections.push(`## Project memory\n${memoryContent}`)
      }

      // 2. Session checkpoint - if exists
      const checkpointPath = path.join(sessionDir, "checkpoint.md")
      const checkpointContent = await readFileSize(checkpointPath, 15000)
      if (checkpointContent.trim()) {
        sections.push(`## Session checkpoint\n${checkpointContent}`)
      }

      // 3. Session notes - if exists
      const notesPath = path.join(sessionDir, "notes.md")
      const notesContent = await readFileSize(notesPath, 6000)
      if (notesContent.trim()) {
        sections.push(`## Session notes\n${notesContent}`)
      }

      if (sections.length === 0) return

      const preamble = [
        "The following blocks are auto-loaded from your session memory.",
        "They are already in your context — do not Read them as whole files.",
        "Use Grep for specific facts instead.",
        "",
      ].join("\n")

      const reminder = [
        "",
        "Resume directly. Do not acknowledge this memory dump, do not recap.",
        "Pick up the last task as if the break never happened.",
      ].join("\n")

      output.context.push(preamble + sections.join("\n\n") + reminder)
    },
  }
}

export default MemoryContextPlugin
