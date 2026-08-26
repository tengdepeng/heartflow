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
    icon: input.icon?.trim() || '📦',
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

/** 组内拖拽排序（规格 §3.4）：把 id 移到 beforeId 之前（beforeId 为 null 则移到末尾）。
 *  跨分类拖拽不支持——分类是分组维度，排序只在组内有效。 */
function moveEntry(id: string, beforeId: string | null): void {
  const entry = entries.value.find((e) => e.id === id)
  if (!entry || id === beforeId) return
  const cat = entry.category
  const group = sortedEntries().filter((e) => e.category === cat && e.id !== id)
  let idx = beforeId ? group.findIndex((e) => e.id === beforeId) : group.length
  if (idx < 0) idx = group.length
  group.splice(idx, 0, entry)
  const newSort = new Map<string, number>()
  group.forEach((e, i) => newSort.set(e.id, i))
  entries.value = entries.value.map((e) =>
    e.category === cat ? { ...e, sort: newSort.get(e.id) ?? e.sort } : e,
  )
  persist()
}

/** 分类管理（规格 §3.4）：重命名分类，同名词目自动合并到新名称下。 */
function renameCategory(oldCat: string, newCat: string): void {
  const next = newCat.trim()
  if (!next || next === oldCat) return
  entries.value = entries.value.map((e) =>
    e.category === oldCat ? { ...e, category: next } : e,
  )
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
    moveEntry,
    renameCategory,
    recordLaunch,
    launchEntry,
  }
}
