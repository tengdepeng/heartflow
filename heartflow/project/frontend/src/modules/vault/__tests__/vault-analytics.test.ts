// ============================================================
// 安全审计引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Credential, VaultCategory } from '../vault-entries'
import {
  vaultOverview,
  weakPasswords,
  reusedPasswords,
  categoryDistribution,
  vaultInsights,
} from '../vault-analytics'

const NOW = new Date('2026-08-22T10:00:00Z')

const CATS: VaultCategory[] = [
  { id: 'login', name: '登录', icon: '🔑' },
  { id: 'finance', name: '金融', icon: '💰' },
  { id: 'email', name: '邮箱', icon: '✉️' },
]

function cred(over: Partial<Credential> = {}): Credential {
  return {
    id: `cr${Math.random().toString(36).slice(2, 6)}`,
    title: '条目',
    username: 'user',
    password: 'aB3$xY9#zQ7!wP5',
    url: '',
    notes: '',
    category: 'login',
    at: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...over,
  }
}

describe('vaultOverview', () => {
  it('空状态各项归零', () => {
    const ov = vaultOverview([], [], [])
    expect(ov.totalCredentials).toBe(0)
    expect(ov.totalAssets).toBe(0)
    expect(ov.totalArchives).toBe(0)
    expect(ov.weakCount).toBe(0)
    expect(ov.reusedCount).toBe(0)
    expect(ov.emptyCount).toBe(0)
    expect(ov.weakRate).toBe(0)
  })

  it('统计弱密码 / 重复 / 空密码', () => {
    const list = [
      cred({ password: '1234' }),
      cred({ password: '1234' }),
      cred({ password: 'aB3$xY9#zQ7!wP5' }),
      cred({ password: '' }),
    ]
    const ov = vaultOverview(list, [1, 2], [3])
    expect(ov.totalCredentials).toBe(4)
    expect(ov.totalAssets).toBe(2)
    expect(ov.totalArchives).toBe(1)
    expect(ov.weakCount).toBe(2)
    expect(ov.reusedCount).toBe(2)
    expect(ov.emptyCount).toBe(1)
    expect(ov.weakRate).toBe(50)
    expect(ov.reusedRate).toBe(50)
  })
})

describe('weakPasswords', () => {
  it('识别弱密码并按强度升序', () => {
    const list = [
      cred({ title: '强', password: 'aB3$xY9#zQ7!wP5' }),
      cred({ title: '弱', password: '1234' }),
      cred({ title: '更弱', password: 'a' }),
    ]
    const weak = weakPasswords(list)
    expect(weak.map(w => w.title)).toEqual(['弱', '更弱'])
    expect(weak[0].score).toBeLessThan(weak[1].score)
  })

  it('空密码不计入弱密码', () => {
    const weak = weakPasswords([cred({ password: '' })])
    expect(weak).toHaveLength(0)
  })
})

describe('reusedPasswords', () => {
  it('识别重复密码条目', () => {
    const list = [
      cred({ title: 'A', password: 'same' }),
      cred({ title: 'B', password: 'same' }),
      cred({ title: 'C', password: 'unique' }),
    ]
    const reused = reusedPasswords(list)
    expect(reused).toHaveLength(2)
    expect(reused.every(r => r.count === 2)).toBe(true)
    expect(reused.map(r => r.title).sort()).toEqual(['A', 'B'])
  })

  it('无重复时为空', () => {
    expect(reusedPasswords([cred({ password: 'pwd-a' }), cred({ password: 'pwd-b' })])).toHaveLength(0)
  })
})

describe('categoryDistribution', () => {
  it('按分类统计并降序', () => {
    const list = [
      cred({ category: 'login' }),
      cred({ category: 'login' }),
      cred({ category: 'email' }),
    ]
    const dist = categoryDistribution(list, CATS)
    expect(dist[0].id).toBe('login')
    expect(dist[0].count).toBe(2)
    expect(dist[0].pct).toBe(67)
    expect(dist.find(r => r.id === 'email')!.count).toBe(1)
    expect(dist.some(r => r.id === 'finance')).toBe(false)
  })
})

describe('vaultInsights', () => {
  it('全空库给出温和提示', () => {
    const ins = vaultInsights([], [], [], NOW, 10)
    expect(ins.length).toBe(1)
    expect(ins[0]).toContain('还空着')
  })

  it('弱密码与重复密码被点名', () => {
    const list = [
      cred({ title: '弱密码', password: '1234' }),
      cred({ title: '重复A', password: 'same' }),
      cred({ title: '重复B', password: 'same' }),
    ]
    const ins = vaultInsights(list, [], [], NOW, 10)
    expect(ins.some(s => s.includes('弱密码'))).toBe(true)
    expect(ins.some(s => s.includes('重复使用'))).toBe(true)
  })

  it('久未更新被提示', () => {
    const old = new Date('2025-01-01T10:00:00Z')
    const list = [cred({ updatedAt: old.toISOString() })]
    const ins = vaultInsights(list, [1], [2], NOW, 10)
    expect(ins.some(s => s.includes('半年未更新'))).toBe(true)
  })

  it('limit 截断', () => {
    const list = [
      cred({ title: '弱', password: '1234' }),
      cred({ title: '重复A', password: 'same' }),
      cred({ title: '重复B', password: 'same' }),
      cred({ title: '空', password: '' }),
    ]
    const full = vaultInsights(list, [], [], NOW, 10)
    expect(full.length).toBeGreaterThan(3)
    const limited = vaultInsights(list, [], [], NOW, 2)
    expect(limited.length).toBe(2)
  })
})
