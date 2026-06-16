/**
 * auto-checkpoint for OpenCode
 *
 * Hooks into session compaction to ensure checkpoint.md is bootstrapped
 * and memory context is injected, so agents retain state across context resets.
 *
 * Pattern derived from MiMo-Code's memory-context.ts plugin and the
 * auto-dream.ts interval-based trigger design.
 */

import type { Plugin } from "@opencode-ai/plugin"
import * as fs from "node:fs/promises"
import * as path from "node:path"

const MEMORY_ROOT = ".opencode/memory"
const CHECKPOINT_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes between auto-checkpoints

async function readBudgeted(filePath: string, maxBytes: number): Promise<string> {
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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function statMtimeMs(filePath: string): Promise<number> {
  try {
    const s = await fs.stat(filePath)
    return s.mtimeMs
  } catch {
    return 0
  }
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

async function renderCheckpointTemplate(sessionID: string, atTime: string): Promise<string> {
  return [
    "# Session checkpoint",
    `_Auto-checkpoint written at ${atTime}_`,
    "",
    "## §1 Active intent",
    "_User's most recent explicit request, verbatim block-quoted from the conversation. The verbatim quote is the ground truth for what to do — do not paraphrase._",
    "",
    "(none yet)",
    "",
    "## §2 Next concrete action",
    "_The single next concrete step, derived from §1 and current state. Include verbatim quote when the user gave one._",
    "",
    "(none yet)",
    "",
    "## §3 Directives (this session)",
    "_This session's specific working style. Project-level rules are in .opencode/memory/MEMORY.md — do not duplicate them here. Only put items that are session-specific._",
    "",
    "(none)",
    "",
    "## §4 Task tree",
    "_Hierarchical view of tasks with current focus marked. One bullet per task with status + summary. Indent sub-tasks two spaces under their parent._",
    "",
    "(none yet)",
    "",
    "## §5 Current work",
    "_Description of what was being done immediately before this checkpoint. Mention specific file paths and code locations._",
    "",
    "(none yet)",
    "",
    "## §6 Files and code sections",
    "_Files actively being read or modified. List with one-line purpose._",
    "",
    "(none yet)",
    "",
    "## §7 Discovered knowledge (cross-task)",
    "_Facts learned during this session that may apply to future tasks. Items here are candidates for promotion to .opencode/memory/MEMORY.md if they prove durable._",
    "",
    "(none yet)",
    "",
    "## §8 Errors and fixes",
    "_Errors encountered this session and how they were resolved. Newest first._",
    "",
    "(none)",
    "",
    "## §9 Live resources",
    "_Runtime state: branch, uncommitted files, running processes, temp artifacts. Most volatile — don't dwell on details that change every minute._",
    "",
    "(none yet)",
    "",
    "## §10 Design decisions and discussion outcomes",
    "_Decisions reached through discussion that produced no immediate code/file artifact. Captures user intent or trade-off rationale future agents need to understand \"why we did it this way\". Promote to MEMORY.md ## Architecture decisions when proven cross-session-durable._",
    "",
    "(none yet)",
    "",
    "## §11 Open notes",
    "_Writer-curated catch-all for items that don't fit §1-§10. Quotes from conversation, unresolved questions, micro-observations, miscellaneous. Cleaner than letting orphan content pollute §3 or §7. May be empty for many checkpoints._",
    "",
    "(none yet)",
    "",
  ].join("\n")
}

const notesTemplate = [
  "# Session notes",
  "_Free-form scratchpad for the main agent. Append entries as you go; the checkpoint writer reconciles them at checkpoint events. Format each entry as `## [turn N · YYYY-MM-DDTHH:MM:SSZ]` (minute precision UTC, seconds optional) followed by free-form body. Before appending: scan existing entries — if you've already noted substantially similar content, add a short `(see entry above)` reference instead of duplicating._",
  "",
].join("\n")

export const AutoCheckpointPlugin: Plugin = async ({ directory }) => {
  const memoryDir = path.join(directory, MEMORY_ROOT)
  const memoryFile = path.join(memoryDir, "MEMORY.md")

  return {
    "experimental.session.compacting": async (input, output) => {
      const sessionID = (input as any).sessionID as string | undefined
      const now = Date.now()

      // --- Bootstrap phase: mirror MiMo's ensureCheckpointTemplate / ensureNotesTemplate ---
      if (sessionID) {
        const sessionDir = path.join(memoryDir, "sessions", sessionID)
        const checkpointFile = path.join(sessionDir, "checkpoint.md")
        const notesFile = path.join(sessionDir, "notes.md")

        await ensureDir(sessionDir)

        const checkpointExists = await fileExists(checkpointFile)
        const checkpointAge = checkpointExists ? await statMtimeMs(checkpointFile) : 0

        if (!checkpointExists) {
          const tpl = await renderCheckpointTemplate(sessionID, new Date(now).toISOString())
          await fs.writeFile(checkpointFile, tpl)
        } else if (checkpointAge > 0 && now - checkpointAge > CHECKPOINT_COOLDOWN_MS) {
          try {
            await fs.utimes(checkpointFile, new Date(now), new Date(now))
          } catch { /* best-effort */ }
        }

        const notesExists = await fileExists(notesFile)
        if (!notesExists) {
          await fs.writeFile(notesFile, notesTemplate)
        }
      }

      // --- Injection phase: mirror MiMo's memory-context + renderRebuildContext ---
      // Read files from the most recent session if sessionID is available,
      // otherwise fall back to MEMORY.md only.
      const memoryContent = await readBudgeted(memoryFile, 25000)

      let checkpointContent = ""
      let notesContent = ""
      if (sessionID) {
        const sessionDir = path.join(memoryDir, "sessions", sessionID)
        checkpointContent = await readBudgeted(path.join(sessionDir, "checkpoint.md"), 15000)
        notesContent = await readBudgeted(path.join(sessionDir, "notes.md"), 6000)
      }

      const sections: string[] = []
      if (memoryContent.trim()) {
        sections.push(`## Project memory\n${memoryContent}`)
      }
      if (checkpointContent.trim()) {
        sections.push(`## Session checkpoint\n${checkpointContent}`)
      }
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

export default AutoCheckpointPlugin
