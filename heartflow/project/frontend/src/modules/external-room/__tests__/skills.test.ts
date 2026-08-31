// ============================================================
// 技能登记（skills）模块测试
// 隔离 storage（vi.hoisted + Map 后端），验证种子（镜我意图 + 顾问调令）、
// 启用开关、外部技能增删、状态聚合。本模块为叶子，不碰 AI 重链
// （出口闸由组件层把关，故 addExternalSkill 不在此校验 consented）。
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'

const hoisted = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  return { store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (k: string, d: unknown) => (hoisted.store.has(k) ? hoisted.store.get(k) : d),
    setKV: (k: string, v: unknown) => void hoisted.store.set(k, v),
    removeKV: (k: string) => void hoisted.store.delete(k),
  },
}))

import {
  getMirrorSkills,
  getAdvisorSkills,
  getExternalSkills,
  getAllSkills,
  isEnabled,
  setEnabled,
  addExternalSkill,
  removeExternalSkill,
  getEnabledSkillIds,
  getStatus,
} from '../skills'

beforeEach(() => hoisted.store.clear())

describe('种子来源', () => {
  it('镜我意图 11 项（不含 unknown）', () => {
    const m = getMirrorSkills()
    expect(m).toHaveLength(11)
    expect(m.some((s) => s.id === 'mirror:unknown')).toBe(false)
    expect(m[0].source).toBe('mirror')
    expect(m[0].builtin).toBe(true)
    expect(m[0].requiresConsent).toBe(false)
  })

  it('顾问调令 8 项，与 CommandTaskType 对齐', () => {
    const a = getAdvisorSkills()
    expect(a).toHaveLength(8)
    expect(a.every((s) => s.source === 'advisor' && s.builtin)).toBe(true)
  })

  it('内置能力共 19，getAllSkills 含源标记', () => {
    const all = getAllSkills()
    expect(all).toHaveLength(19)
    expect(all.filter((s) => s.builtin).length).toBe(19)
    expect(all.filter((s) => s.source === 'external').length).toBe(0)
  })
})

describe('启用开关', () => {
  it('内置能力默认启用', () => {
    expect(isEnabled('mirror:focus')).toBe(true)
    expect(isEnabled('advisor:finance')).toBe(true)
  })

  it('setEnabled 持久化并可查回', () => {
    setEnabled('mirror:focus', false)
    expect(isEnabled('mirror:focus')).toBe(false)
    setEnabled('mirror:focus', true)
    expect(isEnabled('mirror:focus')).toBe(true)
    expect(getEnabledSkillIds()).toContain('mirror:focus')
  })

  it('外部技能默认启用（创建即开）', () => {
    const s = addExternalSkill({ name: '联网查天气' })!
    expect(isEnabled(s.id)).toBe(true)
  })
})

describe('外部技能增删', () => {
  it('空名返回 null 且不写入', () => {
    expect(addExternalSkill({ name: '   ' })).toBeNull()
    expect(getExternalSkills()).toEqual([])
  })

  it('同名返回 null', () => {
    addExternalSkill({ name: '联网查天气' })
    expect(addExternalSkill({ name: '联网查天气' })).toBeNull()
    expect(getExternalSkills()).toHaveLength(1)
  })

  it('正常添加并进入 getAllSkills', () => {
    const s = addExternalSkill({ name: '联网查天气', trigger: '天气', icon: '🌤️', description: '查实时天气' })!
    expect(s.name).toBe('联网查天气')
    expect(s.icon).toBe('🌤️')
    const all = getAllSkills()
    expect(all).toHaveLength(20)
    const ext = all.find((x) => x.id === s.id)!
    expect(ext.source).toBe('external')
    expect(ext.requiresConsent).toBe(true)
    expect(ext.label).toBe('联网查天气')
  })

  it('按 id 移除', () => {
    const a = addExternalSkill({ name: 'A' })!
    addExternalSkill({ name: 'B' })!
    removeExternalSkill(a.id)
    const names = getExternalSkills().map((s) => s.name)
    expect(names).toEqual(['B'])
    expect(getAllSkills().filter((s) => s.source === 'external')).toHaveLength(1)
  })
})

describe('getStatus', () => {
  it('聚合内置 / 外部 / 启用 / 出口闸', () => {
    const off = getStatus(false)
    expect(off.total).toBe(19)
    expect(off.builtin).toBe(19)
    expect(off.external).toBe(0)
    expect(off.enabled).toBe(19)
    expect(off.consented).toBe(false)

    addExternalSkill({ name: '联网查天气' })
    setEnabled('mirror:focus', false)
    const on = getStatus(true)
    expect(on.total).toBe(20)
    expect(on.external).toBe(1)
    expect(on.enabled).toBe(19) // 19 内置 - 1 关闭
    expect(on.consented).toBe(true)
  })
})
