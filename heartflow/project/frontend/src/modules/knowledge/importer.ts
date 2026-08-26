// ============================================================
// 思绪书房 · 内容导入模块
// 4 种导入方式：书籍导入、聊天信笺、通话磁带、网页摘录
// ============================================================

export type ImportSourceType = 'book' | 'chat' | 'call' | 'web'

export interface ImportSource {
  id: string
  type: ImportSourceType
  title: string
  content: string
  sourceMeta?: Record<string, string>
  importedAt: string
}

export const IMPORT_SOURCE_TYPES: { type: ImportSourceType; label: string; icon: string; desc: string }[] = [
  { type: 'book', label: '书籍导入', icon: '📚', desc: '从外部书籍导入笔记和摘录' },
  { type: 'chat', label: '聊天信笺', icon: '✉️', desc: '关联 IM 聊天记录' },
  { type: 'call', label: '通话磁带', icon: '📻', desc: '关联通话记录' },
  { type: 'web', label: '网页摘录', icon: '🌐', desc: '从网页摘录笔记' },
]

export function createImportSource(data: Omit<ImportSource, 'id' | 'importedAt'>): ImportSource {
  return {
    ...data,
    id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    importedAt: new Date().toISOString(),
  }
}

export const IMPORT_SOURCE_ICONS: Record<ImportSourceType, string> = {
  book: '📚',
  chat: '✉️',
  call: '📻',
  web: '🌐',
}

export const IMPORT_SOURCE_LABELS: Record<ImportSourceType, string> = {
  book: '书籍',
  chat: '聊天信笺',
  call: '通话磁带',
  web: '网页摘录',
}