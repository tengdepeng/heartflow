// ============================================================
// 分组头用户排序覆盖测试（Item 1）
// 覆盖：applyGroupOrderOverride（覆盖序优先 + 新 key 追加）/ setGroupOrder
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { useRoomTaxonomy } from '../index'

describe('分组头用户排序覆盖（Item 1）', () => {
  const { applyGroupOrderOverride, setGroupOrder } = useRoomTaxonomy()

  beforeEach(() => {
    // 清空各体系覆盖，避免用例间串扰
    setGroupOrder('domain', [])
    setGroupOrder('group', [])
    setGroupOrder('slot', [])
    setGroupOrder('custom', [])
  })

  it('applyGroupOrderOverride：覆盖里的 key 优先，其余保持原序追加', () => {
    setGroupOrder('domain', ['world', 'time'])
    const keys = ['time', 'work', 'world', 'system']
    expect(applyGroupOrderOverride('domain', keys)).toEqual(['world', 'time', 'work', 'system'])
  })

  it('applyGroupOrderOverride：无覆盖时原序不变', () => {
    const keys = ['inward', 'outward', 'body']
    expect(applyGroupOrderOverride('domain', keys)).toEqual(['inward', 'outward', 'body'])
  })

  it('applyGroupOrderOverride：覆盖中出现的新 key 自动追加到末尾', () => {
    setGroupOrder('domain', ['time', 'work'])
    // 当前实际维度比覆盖多出一个 'system'
    const keys = ['time', 'work', 'system']
    expect(applyGroupOrderOverride('domain', keys)).toEqual(['time', 'work', 'system'])
  })

  it('setGroupOrder + applyGroupOrderOverride：写入后重排生效且可持久化顺序', () => {
    const order = ['work', 'time', 'world', 'system', 'inward', 'outward', 'body', 'knowledge']
    setGroupOrder('domain', order)
    // 与默认序不同，证明覆盖真正介入
    const defaultKeys = ['time', 'work', 'world', 'system', 'inward', 'outward', 'body', 'knowledge']
    expect(applyGroupOrderOverride('domain', defaultKeys)).toEqual(order)
    expect(applyGroupOrderOverride('domain', defaultKeys)[0]).toBe('work')
  })

  it('setGroupOrder 空数组被忽略（不破坏既有覆盖）', () => {
    setGroupOrder('domain', ['world', 'time'])
    setGroupOrder('domain', [])
    expect(applyGroupOrderOverride('domain', ['time', 'work', 'world'])).toEqual(['world', 'time', 'work'])
  })
})
