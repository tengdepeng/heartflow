// ============================================================
// 保险库 · 安全审计引擎（借鉴 KeePass 安全审计）
// 弱密码、重复密码、空密码、分类分布、温和洞察。
// 全部本地计算，不依赖任何外部 API，守宪法第1条本地私有。
// ============================================================

import type { Credential, VaultCategory } from './vault-entries'
import type { Asset, Archive } from './vault'
import { evaluatePasswordStrength } from './password-generator'

export interface VaultAuditOverview {
  totalCredentials: number
  totalAssets: number
  totalArchives: number
  weakCount: number
  reusedCount: number
  emptyCount: number
  categoryCount: number
  weakRate: number
  reusedRate: number
}

export function vaultOverview(
  credentials: Credential[],
  assets: unknown[] = [],
  archives: unknown[] = [],
): VaultAuditOverview {
  const weakCount = weakPasswords(credentials).length
  const reusedCount = reusedPasswords(credentials).length
  const emptyCount = credentials.filter(c => !c.password).length
  const total = credentials.length
  return {
    totalCredentials: total,
    totalAssets: assets.length,
    totalArchives: archives.length,
    weakCount,
    reusedCount,
    emptyCount,
    categoryCount: new Set(credentials.map(c => c.category)).size,
    weakRate: total ? Math.round((weakCount / total) * 100) : 0,
    reusedRate: total ? Math.round((reusedCount / total) * 100) : 0,
  }
}

export interface WeakCredential {
  id: string
  title: string
  score: number
  label: string
}

/** 弱密码条目（强度 < 60），按强度升序 */
export function weakPasswords(credentials: Credential[]): WeakCredential[] {
  return credentials
    .filter(c => c.password && evaluatePasswordStrength(c.password).score < 60)
    .map(c => {
      const s = evaluatePasswordStrength(c.password)
      return { id: c.id, title: c.title, score: s.score, label: s.label }
    })
    .sort((a, b) => a.score - b.score)
}

export interface ReusedCredential {
  id: string
  title: string
  password: string
  count: number
}

/** 被重复使用的密码条目（同一密码出现在 ≥2 条） */
export function reusedPasswords(credentials: Credential[]): ReusedCredential[] {
  const map = new Map<string, Credential[]>()
  credentials.forEach(c => {
    if (!c.password) return
    const arr = map.get(c.password) || []
    arr.push(c)
    map.set(c.password, arr)
  })
  return [...map.entries()]
    .filter(([, arr]) => arr.length > 1)
    .flatMap(([pwd, arr]) => arr.map(c => ({ id: c.id, title: c.title, password: pwd, count: arr.length })))
}

export interface CategoryRow {
  id: string
  name: string
  icon: string
  count: number
  pct: number
}

/** 密码条目分类分布（仅有条目的分类，按数量降序） */
export function categoryDistribution(
  credentials: Credential[],
  categories: VaultCategory[],
): CategoryRow[] {
  const total = Math.max(1, credentials.length)
  return categories
    .map(cat => {
      const count = credentials.filter(c => c.category === cat.id).length
      return { id: cat.id, name: cat.name, icon: cat.icon, count, pct: Math.round((count / total) * 100) }
    })
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
}

/** 温和洞察：弱密码 / 重复 / 空密码 / 久未更新 / 空库提示 */
export function vaultInsights(
  credentials: Credential[],
  assets: unknown[] = [],
  archives: unknown[] = [],
  now: Date = new Date(),
  limit = 4,
): string[] {
  const insights: string[] = []
  const total = credentials.length

  if (total === 0 && assets.length === 0 && archives.length === 0) {
    return ['保险库还空着，先记录一笔资产或密码条目，让它替你守住重要之物。']
  }

  if (total === 0) {
    insights.push('还没有密码条目，把常用账号的登录信息收进来，解锁后即可一键复制。')
  } else {
    const weak = weakPasswords(credentials)
    if (weak.length > 0) {
      insights.push(`${weak.length} 条密码偏弱，其中「${weak[0].title}」最需要更换。`)
    }
    const reused = reusedPasswords(credentials)
    if (reused.length > 0) {
      insights.push(`${reused.length} 条密码被重复使用，建议为不同账号设置不同口令。`)
    }
    const empty = credentials.filter(c => !c.password).length
    if (empty > 0) {
      insights.push(`${empty} 条条目尚未设置密码。`)
    }
    const stale = credentials.filter(c => {
      const days = (now.getTime() - new Date(c.updatedAt).getTime()) / 86400000
      return days > 180
    }).length
    if (stale > 0) {
      insights.push(`${stale} 条密码超过半年未更新，可考虑轮换。`)
    }
  }

  if (assets.length === 0) {
    insights.push('还没有资产记录，把贵重物品与账户价值记下来，趋势会随时间浮现。')
  }

  if (archives.length === 0) {
    insights.push('还没有重要档案，证件号、存放位置等关键信息可加密留存。')
  }

  return insights.slice(0, limit)
}

// ============================================================
// 资产 / 档案安全审计（真实解密数据 hf:vault_cipher 中的 VaultData）
// 集中度 / 完整度 / 陈旧记录 / 温和洞察。
// ============================================================

/** 资产分类元信息（与 Vault.vue 猫色板一致） */
export const ASSET_CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  financial: { icon: '💰', label: '金融', color: '#8a9a7a' },
  realestate: { icon: '🏠', label: '房产', color: '#e0a96d' },
  digital: { icon: '💻', label: '数字', color: '#6b9fc4' },
  physical: { icon: '📦', label: '实物', color: '#d98c7a' },
  intangible: { icon: '✨', label: '无形', color: '#a07c8c' },
  other: { icon: '📋', label: '其他', color: '#6b7280' },
}

export interface LargestAsset {
  name: string
  value: number
  pct: number
}

export interface VaultAssetAuditOverview {
  totalAssets: number
  totalValue: number
  archiveCount: number
  categoryCount: number
  missingValueCount: number
  missingNoteCount: number
  staleCount: number
  archiveMissingDetailCount: number
  largest: LargestAsset | null
  top3Pct: number
}

function daysSince(iso: string | undefined, now: Date): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return (now.getTime() - t) / 86400000
}

/** 资产/档案安全审计概览 */
export function assetAuditOverview(
  assets: Asset[],
  archives: Archive[],
  now: Date = new Date(),
  staleDays = 180,
): VaultAssetAuditOverview {
  const totalValue = assets.reduce((s, a) => s + (a.value || 0), 0)
  const missingValue = assets.filter(a => !a.value || a.value <= 0)
  const missingNote = assets.filter(a => !a.note || !a.note.trim())
  const stale = assets.filter(a => daysSince(a.at, now) > staleDays)
  const archiveMissingDetail = archives.filter(a => !a.detail || !a.detail.trim())

  const sorted = assets.map(a => a.value || 0).sort((a, b) => b - a)
  let top3 = 0
  sorted.slice(0, 3).forEach(v => { top3 += v })
  let largest: LargestAsset | null = null
  if (assets.length > 0) {
    const top = [...assets].sort((a, b) => (b.value || 0) - (a.value || 0))[0]
    largest = {
      name: top.name,
      value: top.value || 0,
      pct: totalValue > 0 ? Math.round(((top.value || 0) / totalValue) * 100) : 0,
    }
  }

  return {
    totalAssets: assets.length,
    totalValue,
    archiveCount: archives.length,
    categoryCount: new Set(assets.map(a => a.category)).size,
    missingValueCount: missingValue.length,
    missingNoteCount: missingNote.length,
    staleCount: stale.length,
    archiveMissingDetailCount: archiveMissingDetail.length,
    largest,
    top3Pct: totalValue > 0 ? Math.round((top3 / totalValue) * 100) : 0,
  }
}

export interface AssetCategoryAuditRow {
  cat: string
  icon: string
  label: string
  color: string
  count: number
  total: number
  pct: number
}

/** 资产按分类分布（仅有资产的分类，按价值降序） */
export function assetCategoryDistribution(assets: Asset[]): AssetCategoryAuditRow[] {
  const total = Math.max(1, assets.reduce((s, a) => s + (a.value || 0), 0))
  const seen = new Map<string, number>()
  assets.forEach(a => {
    seen.set(a.category, (seen.get(a.category) || 0) + (a.value || 0))
  })
  return [...seen.entries()]
    .map(([cat, value]) => {
      const meta = ASSET_CATEGORY_META[cat] || ASSET_CATEGORY_META.other
      return {
        cat,
        icon: meta.icon,
        label: meta.label,
        color: meta.color,
        count: assets.filter(a => a.category === cat).length,
        total: Math.round(value * 100) / 100,
        pct: Math.round((value / total) * 100),
      }
    })
    .sort((a, b) => b.total - a.total)
}

/** 温和审计洞察：集中度 / 完整度 / 陈旧 / 空库提示 */
export function vaultAssetInsights(
  assets: Asset[],
  archives: Archive[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  const insights: string[] = []
  const ov = assetAuditOverview(assets, archives, now)

  if (ov.totalAssets === 0 && ov.archiveCount === 0) {
    return ['保险库还空着，先记录一笔资产或重要档案，让它替你守住重要之物。']
  }

  if (ov.totalAssets === 0) {
    insights.push('还没有资产记录，把贵重物品与账户价值记下来，趋势会随时间浮现。')
  } else {
    if (ov.largest && ov.largest.pct >= 50) {
      insights.push(`「${ov.largest.name}」占资产 ${ov.largest.pct}%，价值集中度偏高，建议分散持有。`)
    }
    if (ov.missingValueCount > 0) {
      insights.push(`${ov.missingValueCount} 条资产价值为 0，可补记或删除闲置条目。`)
    }
    if (ov.missingNoteCount > 0) {
      insights.push(`${ov.missingNoteCount} 条资产未填备注，建议补充存放位置或凭证信息。`)
    }
    if (ov.staleCount > 0) {
      insights.push(`${ov.staleCount} 条资产超过半年未更新，可抽空复核现值。`)
    }
  }

  if (ov.archiveCount === 0) {
    insights.push('还没有重要档案，证件号、存放位置等关键信息可加密留存。')
  } else if (ov.archiveMissingDetailCount > 0) {
    insights.push(`${ov.archiveMissingDetailCount} 个档案未填备注，补充后可减少遗忘。`)
  }

  return insights.slice(0, limit)
}
