// ============================================================
// 存储组合层 · 测试
// 验证 storage 对象包含所有领域模块的方法
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from './test-utils'

describe('storage 组合层', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../core')
    invalidateCache()
  })

  async function fresh() {
    const mod = await import('../index')
    return mod.storage
  }

  it('storage 对象包含所有领域方法', async () => {
    const s = await fresh()
    // 配置
    expect(typeof s.getConfig).toBe('function')
    expect(typeof s.setConfig).toBe('function')
    // 会话
    expect(typeof s.getSessions).toBe('function')
    expect(typeof s.addSession).toBe('function')
    expect(typeof s.updateSession).toBe('function')
    // 结晶
    expect(typeof s.getCrystals).toBe('function')
    expect(typeof s.addCrystal).toBe('function')
    expect(typeof s.updateCrystal).toBe('function')
    expect(typeof s.removeCrystal).toBe('function')
    // 载体
    expect(typeof s.getCarriers).toBe('function')
    expect(typeof s.setCarriers).toBe('function')
    // 情绪
    expect(typeof s.getEmotions).toBe('function')
    expect(typeof s.setEmotions).toBe('function')
    // 笔记
    expect(typeof s.getNotes).toBe('function')
    expect(typeof s.setNotes).toBe('function')
    // 目标
    expect(typeof s.getGoals).toBe('function')
    expect(typeof s.setGoals).toBe('function')
    // 锚点
    expect(typeof s.getAnchors).toBe('function')
    expect(typeof s.setAnchors).toBe('function')
    // 羁绊
    expect(typeof s.getRelations).toBe('function')
    expect(typeof s.setRelations).toBe('function')
    // 账本
    expect(typeof s.getLedger).toBe('function')
    expect(typeof s.addLedgerRecord).toBe('function')
    // 插件
    expect(typeof s.getPluginRegistry).toBe('function')
    expect(typeof s.setPluginRegistry).toBe('function')
    // KV
    expect(typeof s.getKV).toBe('function')
    expect(typeof s.setKV).toBe('function')
    // 标签分类
    expect(typeof s.getTagCategories).toBe('function')
    expect(typeof s.setTagCategories).toBe('function')
    // 宪法
    expect(typeof s.getConstitution).toBe('function')
    expect(typeof s.setConstitution).toBe('function')
    // 幕僚
    expect(typeof s.getAdvisors).toBe('function')
    expect(typeof s.setAdvisors).toBe('function')
    expect(typeof s.setAdvisorMessages).toBe('function')
    // 清除
    expect(typeof s.clear).toBe('function')
  })

  it('getConfig 返回默认值', async () => {
    const s = await fresh()
    const cfg = s.getConfig()
    expect(cfg.theme).toBe('dark')
    expect(cfg.timer.defaultDuration).toBe(25)
  })

  it('getSessions 返回空数组', async () => {
    const s = await fresh()
    expect(s.getSessions()).toEqual([])
  })

  it('getCrystals 返回空数组', async () => {
    const s = await fresh()
    expect(s.getCrystals()).toEqual([])
  })

  it('getKV 返回默认值', async () => {
    const s = await fresh()
    expect(s.getKV('nonexistent', 42)).toBe(42)
  })

  it('setKV 写入后可读取', async () => {
    const s = await fresh()
    s.setKV('testKey', 'testValue')
    expect(s.getKV('testKey', '')).toBe('testValue')
  })
})