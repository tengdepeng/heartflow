// ============================================================
// 思绪书房 · 笔记双向链接（蓝图17 九 · 思源笔记双链反向面板）
// 本地优先：链接从笔记正文 [[note-id]] 或 [[标题]] 解析，
// 存储于独立链接表 hf:note_links，与笔记正文同源、可重建。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { Note } from '../../types'

/** 笔记间链接（有向：source 引用 target） */
export interface NoteLink {
  id: string
  sourceId: string
  targetId: string
  createdAt: string
  /** 块级引用锚点 id（Obsidian 风格 ^id；可空表示整篇引用） */
  blockId?: string
}

const LINKS_KEY = 'hf:note_links'

function loadLinks(): NoteLink[] {
  try {
    return JSON.parse(storage.getKV<string>(LINKS_KEY, '[]')) as NoteLink[]
  } catch {
    return []
  }
}

function saveLinks(data: NoteLink[]) {
  storage.setKV(LINKS_KEY, JSON.stringify(data))
}

const links = ref<NoteLink[]>(loadLinks())

function generateId(): string {
  return `link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** 解析正文中的 [[...]] 引用令牌（返回内部文本，可能为 id / 标题 / 标题#块锚点） */
export function parseLinkRefs(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || []
  return [...new Set(matches.map(m => m.slice(2, -2).trim()).filter(Boolean))]
}

/**
 * 将引用令牌拆分为「目标引用 + 块锚点」。
 * 例：「我的笔记#abc123」→ { ref: '我的笔记', blockId: 'abc123' }
 *      「note_1」→ { ref: 'note_1' }
 */
export function splitBlockRef(token: string): { ref: string; blockId?: string } {
  const idx = token.indexOf('#')
  if (idx === -1) return { ref: token.trim() }
  return {
    ref: token.slice(0, idx).trim(),
    blockId: token.slice(idx + 1).trim() || undefined,
  }
}

/**
 * 将令牌解析为目标笔记 id：
 * 1) 精确 id 匹配优先；2) 否则按标题（去前后空白、忽略大小写）匹配。
 * 令牌可能带块锚点（如「标题#块id」），解析前先剥离 # 之后的部分。
 */
export function resolveTargetId(token: string, notes: Note[]): string | null {
  const t = token.split('#')[0].trim()
  if (!t) return null
  const byId = notes.find(n => n.id === t)
  if (byId) return byId.id
  const lower = t.toLowerCase()
  const byTitle = notes.find(n => (n.title || '').trim().toLowerCase() === lower)
  return byTitle ? byTitle.id : null
}

/** 本笔记引用了哪些笔记（出链） */
export function getOutgoingLinks(noteId: string): NoteLink[] {
  return links.value.filter(l => l.sourceId === noteId)
}

/** 哪些笔记引用了本笔记（反向链接 / 双链面板核心） */
export function getBacklinks(noteId: string): NoteLink[] {
  return links.value.filter(l => l.targetId === noteId)
}

/** 删除某笔记时清理其全部链接（出链 + 反向链接），避免留下死链 */
export function removeLinksForNote(noteId: string): void {
  const before = links.value.length
  links.value = links.value.filter(
    l => l.sourceId !== noteId && l.targetId !== noteId,
  )
  if (links.value.length !== before) {
    saveLinks(links.value)
  }
}

/**
 * 由某笔记正文重建其全部出链（幂等）：
 * 解析 [[...]]（支持 [[笔记#块锚点]]）→ 解析目标 id → 与现有该笔记出链做差量合并。
 * 仅当内容发生变化时才写入存储。
 */
export function syncLinksForNote(noteId: string, content: string, notes: Note[]): void {
  const wanted = new Map<string, { targetId: string; blockId?: string }>()
  for (const raw of parseLinkRefs(content)) {
    const { ref, blockId } = splitBlockRef(raw)
    const targetId = resolveTargetId(ref, notes)
    if (!targetId || targetId === noteId) continue
    const key = blockId ? `${targetId}#${blockId}` : targetId
    wanted.set(key, { targetId, blockId })
  }

  const existing = links.value.filter(l => l.sourceId === noteId)
  const existingKeys = new Set(
    existing.map(l => (l.blockId ? `${l.targetId}#${l.blockId}` : l.targetId)),
  )

  let changed = false
  const kept = links.value.filter(l => {
    if (l.sourceId === noteId) {
      const key = l.blockId ? `${l.targetId}#${l.blockId}` : l.targetId
      if (!wanted.has(key)) {
        changed = true
        return false
      }
    }
    return true
  })

  const toAdd: NoteLink[] = []
  for (const { targetId, blockId } of wanted.values()) {
    const key = blockId ? `${targetId}#${blockId}` : targetId
    if (!existingKeys.has(key)) {
      toAdd.push({
        id: generateId(),
        sourceId: noteId,
        targetId,
        createdAt: new Date().toISOString(),
        blockId,
      })
      changed = true
    }
  }

  if (changed) {
    links.value = [...kept, ...toAdd]
    saveLinks(links.value)
  }
}

/**
 * 提取某块锚点对应的正文文本（用于反向链接展示「被引用的是哪一段」）。
 * 锚点语法：行尾 ` ^块id`（Obsidian 风格）。优先按段落（空行分隔）取整段，
 * 再回退到单行。找不到返回 null。
 */
export function getBlockContent(content: string, blockId: string): string | null {
  const escaped = blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const anchorRe = new RegExp(`\\s*\\^${escaped}\\s*$`)

  for (const para of content.split(/\n\n+/)) {
    if (anchorRe.test(para)) {
      return para.replace(anchorRe, '').trim()
    }
  }
  for (const line of content.split('\n')) {
    if (anchorRe.test(line)) {
      return line.replace(anchorRe, '').trim()
    }
  }
  return null
}

export function useNoteLinks() {
  return {
    links,
    parseLinkRefs,
    splitBlockRef,
    resolveTargetId,
    getOutgoingLinks,
    getBacklinks,
    getBlockContent,
    syncLinksForNote,
    removeLinksForNote,
  }
}
