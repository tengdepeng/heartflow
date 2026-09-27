// ============================================================
// 阅览殿 · 待读箱
// 蓝图 2.202：saved_item.content_snapshot{ local_path, content_hash }
// 本地只读快照：把想读的内容（粘贴 / 导入文件）按全文本落盘，
// 用 content_hash 去重，随时「打开阅读」或「转正书架」。
// 全程本地、不触云（守「本地私有」硬约束）。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { useReadingHall } from './hall'

export type InboxStatus = 'pending' | 'read'

export interface InboxItem {
  id: string
  title: string
  contentHash: string
  source?: string
  tags: string[]
  createdAt: string
  status: InboxStatus
  readAt?: string
}

const INBOX_LIST_KEY = 'hf:reading:inbox'
const inboxContentKey = (id: string) => `hf:reading:inbox-content:${id}`

function loadInbox(): InboxItem[] {
  try {
    const raw = storage.getKV<string>(INBOX_LIST_KEY, '[]')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as InboxItem[]) : []
  } catch {
    return []
  }
}

function saveInbox(list: InboxItem[]) {
  storage.setKV(INBOX_LIST_KEY, JSON.stringify(list))
}

const inbox = ref<InboxItem[]>(loadInbox())

function generateId(): string {
  return `inb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 取正文首行非空作为默认书名（截断 40 字） */
function deriveTitle(text: string): string {
  const firstLine = text.split(/\n+/).map(p => p.trim()).find(p => p) ?? ''
  return firstLine ? firstLine.slice(0, 40) : '待读内容'
}

/** 内容指纹（djb2，纯函数、确定可单测），用于去重与 content_hash */
export function computeContentHash(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0
  }
  return `h${(h >>> 0).toString(36)}`
}

function saveInboxContent(id: string, content: string) {
  storage.setKV(inboxContentKey(id), content)
}

function loadInboxContent(id: string): string {
  return storage.getKV<string>(inboxContentKey(id), '')
}

/** 估页数：非空段数 */
function estimatePages(text: string): number {
  return Math.max(1, text.split(/\n+/).filter(p => p.trim()).length)
}

/**
 * 收入待读箱。按 content_hash 去重：同内容已存在则回退到已有项（置为待读），
 * 避免重复书目。返回新建或复用的 InboxItem。
 */
export function addInboxItem(input: {
  title?: string
  content: string
  source?: string
  tags?: string[]
}): InboxItem | null {
  const content = input.content
  if (!content.trim()) return null
  const hash = computeContentHash(content)
  const dup = inbox.value.find(i => i.contentHash === hash)
  if (dup) {
    if (dup.status === 'read') {
      dup.status = 'pending'
      dup.readAt = undefined
      inbox.value = [...inbox.value]
      saveInbox(inbox.value)
    }
    return dup
  }
  const id = generateId()
  const item: InboxItem = {
    id,
    title: (input.title || '').trim() || deriveTitle(content),
    contentHash: hash,
    source: input.source?.trim() || undefined,
    tags: input.tags ?? [],
    createdAt: new Date().toISOString(),
    status: 'pending',
  }
  saveInboxContent(id, content)
  inbox.value = [item, ...inbox.value]
  saveInbox(inbox.value)
  return item
}

export function getInboxContent(id: string): string {
  return loadInboxContent(id)
}

export function removeInboxItem(id: string): boolean {
  const idx = inbox.value.findIndex(i => i.id === id)
  if (idx === -1) return false
  inbox.value = inbox.value.filter(i => i.id !== id)
  saveInbox(inbox.value)
  storage.removeKV?.(inboxContentKey(id))
  // removeKV 可能未实现（旧引擎），用覆盖式清空兜底
  try { storage.setKV(inboxContentKey(id), '') } catch { /* noop */ }
  return true
}

export function markInboxRead(id: string): boolean {
  const item = inbox.value.find(i => i.id === id)
  if (!item) return false
  item.status = 'read'
  item.readAt = new Date().toISOString()
  inbox.value = [...inbox.value]
  saveInbox(inbox.value)
  return true
}

/**
 * 转正书架：把待读项全文写入书架书目（同名去重由 hall.addBookFromText 处理），
 * 随后从待读箱移除该项。返回新（或复用）书目 id，失败返回 null。
 */
export function promoteToBook(id: string): string | null {
  const item = inbox.value.find(i => i.id === id)
  if (!item) return null
  const content = loadInboxContent(id)
  if (!content) return null
  const hall = useReadingHall()
  const book = hall.addBookFromText(item.title, '', estimatePages(content), content)
  removeInboxItem(id)
  return book.id
}

export function useReadingInbox() {
  return {
    inbox,
    addInboxItem,
    getInboxContent,
    removeInboxItem,
    markInboxRead,
    promoteToBook,
    computeContentHash,
  }
}
