// ============================================================
// 保险库 · 密码条目与分类（借鉴 KeePass 条目分类管理）
// 密码条目按分类组织，支持搜索、掩码、复制。
// 全部本地实现，不依赖任何外部 API，守宪法第1条本地私有。
// ============================================================

export interface Credential {
  id: string
  title: string
  username: string
  password: string
  url: string
  notes: string
  category: string
  at: string
  updatedAt: string
}

export interface VaultCategory {
  id: string
  name: string
  icon: string
}

export const DEFAULT_VAULT_CATEGORIES: VaultCategory[] = [
  { id: 'login', name: '登录', icon: '🔑' },
  { id: 'finance', name: '金融', icon: '💰' },
  { id: 'email', name: '邮箱', icon: '✉️' },
  { id: 'social', name: '社交', icon: '👥' },
  { id: 'other', name: '其他', icon: '📋' },
]

export interface CredentialInput {
  title: string
  username: string
  password: string
  url: string
  notes: string
  category: string
}

/** 新建一条密码条目 */
export function createCredential(input: CredentialInput, now: Date = new Date()): Credential {
  const ts = now.toISOString()
  return {
    id: `cr${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
    title: input.title.trim(),
    username: input.username.trim(),
    password: input.password,
    url: input.url.trim(),
    notes: input.notes.trim(),
    category: input.category,
    at: ts,
    updatedAt: ts,
  }
}

/** 更新密码条目（仅更新传入字段，并刷新 updatedAt） */
export function updateCredential(
  c: Credential,
  patch: Partial<CredentialInput>,
  now: Date = new Date(),
): Credential {
  return {
    ...c,
    title: patch.title !== undefined ? patch.title.trim() : c.title,
    username: patch.username !== undefined ? patch.username.trim() : c.username,
    password: patch.password !== undefined ? patch.password : c.password,
    url: patch.url !== undefined ? patch.url.trim() : c.url,
    notes: patch.notes !== undefined ? patch.notes.trim() : c.notes,
    category: patch.category !== undefined ? patch.category : c.category,
    updatedAt: now.toISOString(),
  }
}

/** 按标题 / 账号 / 网址 / 备注搜索 */
export function searchCredentials(list: Credential[], query: string): Credential[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    c =>
      c.title.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      c.url.toLowerCase().includes(q) ||
      c.notes.toLowerCase().includes(q),
  )
}

/** 按分类分组（仅返回有条目的分类） */
export function credentialsByCategory(
  list: Credential[],
  categories: VaultCategory[],
): { category: VaultCategory; items: Credential[] }[] {
  return categories
    .map(cat => ({ category: cat, items: list.filter(c => c.category === cat.id) }))
    .filter(g => g.items.length > 0)
}

/** 掩码密码（解锁态下默认隐藏，点击后显示） */
export function maskPassword(pwd: string): string {
  if (!pwd) return ''
  return '•'.repeat(Math.min(pwd.length, 12))
}

export function categoryName(categories: VaultCategory[], id: string): string {
  return categories.find(c => c.id === id)?.name || '未分类'
}

export function categoryIcon(categories: VaultCategory[], id: string): string {
  return categories.find(c => c.id === id)?.icon || '📋'
}
