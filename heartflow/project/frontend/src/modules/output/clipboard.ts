// ============================================================
// 剪贴板管理 · 引擎（蓝图 APK 2.212 快贴 → 输出管理）
// 把系统剪贴板从「一次性暂存」升级为「可检索的历史库」：
//   - 历史：按时间倒序留存复制记录，全文可搜索，一键复制回剪贴板
//   - 固定：常用片段置顶，不受自动清理影响
//   - 素材入库：剪贴板条目升级为常驻片段（Snippet），记录复用次数
//   - 清理：按条数上限与天数自动清理，固定条目豁免
// 存储键（明文 JSON，对齐蓝图第一层）：
//   hf:output:clipboard / hf:output:snippets / hf:output:clip_policy
// ============================================================

import { computed, ref } from 'vue'
import { storage } from '../../engine/storage'

// ---- 类型（对齐蓝图 2.212 关键数据模型） ----

export type ClipItemType = 'text' | 'image' | 'file'

export interface ClipItem {
  id: string
  type: ClipItemType
  text: string
  /** 来源应用（无法探测时为空） */
  sourceApp?: string
  copiedAt: string
  isPinned: boolean
  tags: string[]
}

export interface Snippet {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  usageCount: number
}

export interface ClipCleanPolicy {
  /** 历史条数上限 */
  maxItems: number
  /** 保留天数 */
  maxDays: number
  /** 清理时是否连同固定条目一起清除（默认豁免） */
  clearPinned: boolean
  lastCleanedAt: string | null
}

export const CLIPBOARD_STORAGE_KEYS = {
  items: 'hf:output:clipboard',
  snippets: 'hf:output:snippets',
  policy: 'hf:output:clip_policy',
} as const

export const DEFAULT_CLEAN_POLICY: ClipCleanPolicy = {
  maxItems: 500,
  maxDays: 30,
  clearPinned: false,
  lastCleanedAt: null,
}

// ---- 存储原语 ----

function loadItems(): ClipItem[] {
  return storage.getKV<ClipItem[]>(CLIPBOARD_STORAGE_KEYS.items, [])
}
function persistItems(list: ClipItem[]): void {
  storage.setKV(CLIPBOARD_STORAGE_KEYS.items, list)
}
function loadSnippets(): Snippet[] {
  return storage.getKV<Snippet[]>(CLIPBOARD_STORAGE_KEYS.snippets, [])
}
function persistSnippets(list: Snippet[]): void {
  storage.setKV(CLIPBOARD_STORAGE_KEYS.snippets, list)
}

export function getCleanPolicy(): ClipCleanPolicy {
  return storage.getKV<ClipCleanPolicy>(CLIPBOARD_STORAGE_KEYS.policy, { ...DEFAULT_CLEAN_POLICY })
}
export function updateCleanPolicy(patch: Partial<Omit<ClipCleanPolicy, 'lastCleanedAt'>>): ClipCleanPolicy {
  const next: ClipCleanPolicy = {
    ...getCleanPolicy(),
    maxItems: Math.max(10, Math.floor(patch.maxItems ?? getCleanPolicy().maxItems)),
    maxDays: Math.max(1, Math.floor(patch.maxDays ?? getCleanPolicy().maxDays)),
    clearPinned: patch.clearPinned ?? getCleanPolicy().clearPinned,
  }
  storage.setKV(CLIPBOARD_STORAGE_KEYS.policy, next)
  return next
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// ---- 清理 ----

/**
 * 执行清理：删除超出 maxDays 天、以及超出 maxItems 条的条目。
 * 固定条目默认豁免（policy.clearPinned = true 时连固定一起清）。
 * 返回被删除的条数。
 */
export function cleanClipboard(now: Date = new Date()): number {
  const policy = getCleanPolicy()
  const list = loadItems()
  const cutoff = now.getTime() - policy.maxDays * 24 * 60 * 60 * 1000

  let kept = list.filter(item => {
    if (item.isPinned && !policy.clearPinned) return true
    return new Date(item.copiedAt).getTime() >= cutoff
  })

  // 条数上限：固定优先，其余按时间倒序保留
  if (kept.length > policy.maxItems) {
    const pinned = kept.filter(i => i.isPinned)
    const rest = kept
      .filter(i => !i.isPinned)
      .sort((a, b) => new Date(b.copiedAt).getTime() - new Date(a.copiedAt).getTime())
    const budgetForRest = Math.max(0, policy.maxItems - (policy.clearPinned ? 0 : pinned.length))
    kept = policy.clearPinned
      ? [...pinned, ...rest].sort((a, b) => new Date(b.copiedAt).getTime() - new Date(a.copiedAt).getTime()).slice(0, policy.maxItems)
      : [...pinned, ...rest.slice(0, budgetForRest)]
  }

  const removed = list.length - kept.length
  if (removed > 0) persistItems(kept)
  storage.setKV(CLIPBOARD_STORAGE_KEYS.policy, { ...policy, lastCleanedAt: now.toISOString() })
  return removed
}

// ---- 组合式入口 ----

/**
 * 剪贴板管理组合式入口。
 * read-through：items/snippets 为 computed，访问即读存储；写操作 read-modify-write 后落盘。
 */
export function useClipboard() {
  /** 触发刷新（供模板建立响应式依赖） */
  const tick = ref(0)
  function touch() { tick.value++ }

  const items = computed<ClipItem[]>(() => {
    void tick.value
    return [...loadItems()].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.copiedAt).getTime() - new Date(a.copiedAt).getTime()
    })
  })

  const snippets = computed<Snippet[]>(() => {
    void tick.value
    return [...loadSnippets()].sort((a, b) => {
      if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  })

  /**
   * 记录一条剪贴板内容。
   * 去重：与现有条目文本相同时，把该条目时间刷新到最新并置顶，不产生重复。
   * 返回条目 id。
   */
  function add(text: string, opts: { type?: ClipItemType; sourceApp?: string; tags?: string[] } = {}): string | null {
    const trimmed = text.trim()
    if (!trimmed) return null
    const list = loadItems()
    const existing = list.find(i => i.text === trimmed)
    if (existing) {
      existing.copiedAt = new Date().toISOString()
      persistItems(list)
      touch()
      return existing.id
    }
    const item: ClipItem = {
      id: genId('clip'),
      type: opts.type ?? 'text',
      text: trimmed,
      sourceApp: opts.sourceApp,
      copiedAt: new Date().toISOString(),
      isPinned: false,
      tags: opts.tags ?? [],
    }
    list.push(item)
    persistItems(list)
    touch()
    // 惰性执行清理（超限时才删除，成本可忽略）
    cleanClipboard()
    touch()
    return item.id
  }

  /** 固定 / 取消固定 */
  function togglePin(id: string): void {
    const list = loadItems()
    const item = list.find(i => i.id === id)
    if (!item) return
    item.isPinned = !item.isPinned
    persistItems(list)
    touch()
  }

  /** 删除历史条目（敏感内容手动删除） */
  function remove(id: string): void {
    persistItems(loadItems().filter(i => i.id !== id))
    touch()
  }

  /** 全文搜索（标题不区分大小写；空串返回全部） */
  function search(query: string): ClipItem[] {
    const q = query.trim().toLowerCase()
    if (!q) return items.value
    return items.value.filter(i => i.text.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q)))
  }

  /** 复制回系统剪贴板；失败（无权限/不支持）时返回 false */
  async function copyBack(id: string): Promise<boolean> {
    const item = loadItems().find(i => i.id === id)
    if (!item) return false
    try {
      await navigator.clipboard.writeText(item.text)
      return true
    } catch {
      return false
    }
  }

  // ---- 片段库（Snippet） ----

  /** 把剪贴板条目升级为常驻片段。返回片段 id；条目不存在时返回 null。 */
  function promoteToSnippet(clipId: string, title?: string): string | null {
    const item = loadItems().find(i => i.id === clipId)
    if (!item) return null
    return addSnippet({ title: title ?? item.text.slice(0, 20), content: item.text })
  }

  /** 新建常驻片段。返回片段 id。 */
  function addSnippet(input: { title: string; content: string }): string {
    const now = new Date().toISOString()
    const snip: Snippet = {
      id: genId('snip'),
      title: input.title.trim() || input.content.slice(0, 20),
      content: input.content,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    }
    const list = loadSnippets()
    list.push(snip)
    persistSnippets(list)
    touch()
    return snip.id
  }

  /** 更新片段标题/内容 */
  function updateSnippet(id: string, patch: Partial<Pick<Snippet, 'title' | 'content'>>): void {
    const list = loadSnippets()
    const snip = list.find(s => s.id === id)
    if (!snip) return
    if (patch.title !== undefined) snip.title = patch.title
    if (patch.content !== undefined) snip.content = patch.content
    snip.updatedAt = new Date().toISOString()
    persistSnippets(list)
    touch()
  }

  /** 删除片段 */
  function removeSnippet(id: string): void {
    persistSnippets(loadSnippets().filter(s => s.id !== id))
    touch()
  }

  /** 取用片段：复制到系统剪贴板并累计复用次数（高频内容优先展示的依据） */
  async function useSnippet(id: string): Promise<boolean> {
    const list = loadSnippets()
    const snip = list.find(s => s.id === id)
    if (!snip) return false
    try {
      await navigator.clipboard.writeText(snip.content)
    } catch {
      return false
    }
    snip.usageCount++
    snip.updatedAt = new Date().toISOString()
    persistSnippets(list)
    touch()
    return true
  }

  /** 概览统计 */
  const stats = computed(() => {
    void tick.value
    const list = loadItems()
    const snips = loadSnippets()
    return {
      total: list.length,
      pinned: list.filter(i => i.isPinned).length,
      snippets: snips.length,
      topUsed: [...snips].sort((a, b) => b.usageCount - a.usageCount).slice(0, 3),
    }
  })

  return {
    items,
    snippets,
    stats,
    add,
    togglePin,
    remove,
    search,
    copyBack,
    promoteToSnippet,
    addSnippet,
    updateSnippet,
    removeSnippet,
    useSnippet,
    clean: cleanClipboard,
    getPolicy: getCleanPolicy,
    updatePolicy: (patch: Partial<Omit<ClipCleanPolicy, 'lastCleanedAt'>>) => {
      const next = updateCleanPolicy(patch)
      touch()
      return next
    },
  }
}
