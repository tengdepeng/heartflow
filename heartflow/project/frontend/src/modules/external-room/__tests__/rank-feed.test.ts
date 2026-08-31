// ============================================================
// 榜单通道（rank-feed）模块测试
// 隔离 storage（vi.hoisted + Map 后端），验证接入位的增删、启用开关、
// 下游取源（仅启用时供给）、状态。本模块为叶子，不碰 AI 重链。
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
  getSources,
  addSource,
  removeSource,
  isEnabled,
  setEnabled,
  getEnabledSources,
  getStatus,
} from '../rank-feed'

beforeEach(() => hoisted.store.clear())

describe('接入位增删', () => {
  it('初始为空', () => {
    expect(getSources()).toEqual([])
  })

  it('添加返回 label 缺省取 host', () => {
    const s = addSource({ url: 'https://feed.example/rank.json' })
    expect(s).not.toBeNull()
    expect(s!.label).toBe('feed.example')
    expect(getSources()).toHaveLength(1)
  })

  it('允许自定义 label', () => {
    const s = addSource({ url: 'https://a.example/x', label: '我的源' })
    expect(s!.label).toBe('我的源')
  })

  it('空 URL 与重复 URL 返回 null 且不写入', () => {
    expect(addSource({ url: '   ' })).toBeNull()
    addSource({ url: 'https://a.example/x' })
    expect(addSource({ url: 'https://a.example/x' })).toBeNull()
    expect(getSources()).toHaveLength(1)
  })

  it('删除按 id', () => {
    const a = addSource({ url: 'https://a.example/x' })!
    const b = addSource({ url: 'https://b.example/y' })!
    removeSource(a.id)
    const list = getSources()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(b.id)
  })
})

describe('启用开关与下游取源', () => {
  it('默认关闭', () => {
    expect(isEnabled()).toBe(false)
    expect(getEnabledSources()).toEqual([])
  })

  it('启用后下游可取全部源，关闭即零供给', () => {
    addSource({ url: 'https://a.example/x' })
    addSource({ url: 'https://b.example/y' })
    setEnabled(true)
    expect(isEnabled()).toBe(true)
    expect(getEnabledSources()).toHaveLength(2)
    setEnabled(false)
    expect(getEnabledSources()).toEqual([])
  })
})

describe('getStatus', () => {
  it('聚合 enabled / 源数 / 出口闸同意', () => {
    addSource({ url: 'https://a.example/x' })
    setEnabled(true)
    const st = getStatus(true)
    expect(st.enabled).toBe(true)
    expect(st.sourceCount).toBe(1)
    expect(st.consented).toBe(true)
    const off = getStatus(false)
    expect(off.consented).toBe(false)
  })
})
