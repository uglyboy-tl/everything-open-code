/**
 * auto-dream for OpenCode
 *
 * 自动检查是否需要运行 Dream 内存整合。
 * 在新会话创建时检查距上次 Dream 的时间间隔，
 * 如果超过阈值（默认 7 天），通过 event 系统建议用户运行 /dream。
 *
 * 由于 OpenCode 插件 API 不支持直接生成子代理，
 * 此插件仅做检查和提示，不自动执行 Dream。
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DREAM_INTERVAL_DAYS = 7
const DEFAULT_DISTILL_INTERVAL_DAYS = 30
const MIN_SPAWN_GAP_MS = 10_000

const STATE_FILE = ".opencode/memory/.auto-dream-state.json"

interface AutoDreamState {
  lastDreamTime?: number
  lastDistillTime?: number
}

function getStatePath(directory: string): string {
  return path.join(directory, STATE_FILE)
}

async function loadState(directory: string): Promise<AutoDreamState> {
  try {
    const content = await fs.readFile(getStatePath(directory), "utf-8")
    return JSON.parse(content)
  } catch {
    return {}
  }
}

async function saveState(directory: string, state: AutoDreamState): Promise<void> {
  const statePath = getStatePath(directory)
  await fs.mkdir(path.dirname(statePath), { recursive: true })
  await fs.writeFile(statePath, JSON.stringify(state, null, 2))
}

async function checkMemoryFile(directory: string): Promise<{ exists: boolean; mtime: number }> {
  const memoryPath = path.join(directory, ".opencode/memory/MEMORY.md")
  try {
    const stat = await fs.stat(memoryPath)
    return { exists: true, mtime: stat.mtimeMs }
  } catch {
    return { exists: false, mtime: 0 }
  }
}

export const AutoDreamPlugin: Plugin = async ({ directory }) => {
  let lastCheckTime = 0

  return {
    event: async ({ event }) => {
      if (event.type !== "session.created") return

      const info = (event as any).properties?.info
      if (info?.parentID) return

      const now = Date.now()
      if (now - lastCheckTime < MIN_SPAWN_GAP_MS) return
      lastCheckTime = now

      const state = await loadState(directory)
      const memory = await checkMemoryFile(directory)

      const dreamInterval = DEFAULT_DREAM_INTERVAL_DAYS * DAY_MS
      const distillInterval = DEFAULT_DISTILL_INTERVAL_DAYS * DAY_MS

      const lastDream = state.lastDreamTime ?? (memory.exists ? memory.mtime : 0)
      const elapsed = lastDream ? now - lastDream : Infinity

      if (elapsed >= dreamInterval) {
        const daysAgo = elapsed === Infinity
          ? "从未运行"
          : `${Math.round(elapsed / DAY_MS)} 天前`
        console.log(
          `[auto-dream] Dream 内存整合建议：距上次 Dream 已 ${daysAgo}。` +
          `请运行 /dream 执行内存整合。`
        )
      }

      const lastDistill = state.lastDistillTime ?? 0
      const distillElapsed = lastDistill ? now - lastDistill : Infinity

      if (distillElapsed >= distillInterval) {
        const daysAgo = distillElapsed === Infinity
          ? "从未运行"
          : `${Math.round(distillElapsed / DAY_MS)} 天前`
        console.log(
          `[auto-dream] Distill 工作流打包建议：距上次 Distill 已 ${daysAgo}。` +
          `请运行 /distill 执行工作流打包。`
        )
      }
    },
  }
}

export async function recordDreamRun(directory: string): Promise<void> {
  const state = await loadState(directory)
  state.lastDreamTime = Date.now()
  await saveState(directory, state)
}

export async function recordDistillRun(directory: string): Promise<void> {
  const state = await loadState(directory)
  state.lastDistillTime = Date.now()
  await saveState(directory, state)
}

export default AutoDreamPlugin
