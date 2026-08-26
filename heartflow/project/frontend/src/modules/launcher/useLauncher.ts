// ============================================================
// Launcher · 状态引擎（模块级单例，跨视图共享）
// 持久化进明文 JSON 引擎 KV（沿用 engine/storage）：键 `launcher:entries`。
// 不嵌入任何外部 App，仅管理「入口」元数据 + 启动计数。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { ExternalAppEntry, EntryInput } from './types'
import { launchApp, type LaunchResult } from './open'

const STORAGE_KEY = 'launcher:entries'

const entries = ref<ExternalAppEntry[]>(
  storage.getKV<ExternalAppEntry[]>(STORAGE_KEY, []),
)

function persist(): void {
  storage.setKV(STORAGE_KEY, entries.value)
}

function genId(): string {
  return 'app-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}

/** 按 sort 升序的副本 */
function sortedEntries(): ExternalAppEntry[] {
  return [...entries.value].sort((a, b) => a.sort - b.sort)
}

/** 按 category 分组的条目（[[category, Entry[]], ...]），组内已排序 */
const grouped = computed<Array<[string, ExternalAppEntry[]]>>(() => {
  const map = new Map<string, ExternalAppEntry[]>()
  for (const e of sortedEntries()) {
    const arr = map.get(e.category) ?? []
    arr.push(e)
    map.set(e.category, arr)
  }
  return [...map.entries()]
})

function addEntry(input: EntryInput): void {
  const maxSort = entries.value.length
    ? Math.max(...entries.value.map((e) => e.sort))
    : -1
  const entry: ExternalAppEntry = {
    id: genId(),
    name: input.name.trim(),
    icon: input.icon.trim() || '📦',
    category: input.category.trim() || '未分类',
    launch: input.launch.trim(),
    deepLink: input.deepLink?.trim() || undefined,
    useDeepLink: input.useDeepLink,
    sort: maxSort + 1,
    launchCount: 0,
  }
  entries.value = [...entries.value, entry]
  persist()
}

function updateEntry(id: string, patch: Partial<EntryInput>): void {
  entries.value = entries.value.map((e) =>
    e.id === id ? { ...e, ...patch, name: patch.name?.trim() ?? e.name, category: patch.category?.trim() ?? e.category, launch: patch.launch?.trim() ?? e.launch, deepLink: patch.deepLink?.trim() || undefined } : e,
  )
  persist()
}

function removeEntry(id: string): void {
  entries.value = entries.value.filter((e) => e.id !== id)
  persist()
}

function recordLaunch(id: string): void {
  entries.value = entries.value.map((e) =>
    e.id === id
      ? { ...e, launchCount: e.launchCount + 1, lastLaunchedAt: new Date().toISOString() }
      : e,
  )
  persist()
}

/** 启动条目并计数；深链协议失效会降级（不报错） */
async function launchEntry(entry: ExternalAppEntry): Promise<LaunchResult> {
  const res = await launchApp(entry)
  if (res.ok) recordLaunch(entry.id)
  return res
}

export function useLauncher() {
  return {
    entries,
    grouped,
    addEntry,
    updateEntry,
    removeEntry,
    recordLaunch,
    launchEntry,
  }
}
