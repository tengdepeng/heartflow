// ============================================================
// P24-6 数据主权 · 遗忘退场引擎测试
// 覆盖：FORGET_METHODS / HALL_EXIT_STATES / 配置管理 /
//       老化标记 / 封存/休眠 / 数据删除 / 遗忘执行 / 记录管理
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { ForgetMethod } from '../types'

// ---- 共享可变状态 ----

const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}

  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

// ---- Mock engine/storage ----

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T,>(key: string, def: T): T => {
      const store = getKvStore()
      return store[key] !== undefined ? store[key] as T : def
    },
    setKV: (key: string, val: any) => {
      const store = getKvStore()
      store[key] = val
    },
  },
}))

// ---- Mock localStorage ----

vi.stubGlobal('localStorage', {
  _data: {} as Record<string, string>,
  get length() { return Object.keys((this as any)._data).length },
  key(i: number) { return Object.keys((this as any)._data)[i] ?? null },
  getItem(k: string) { return (this as any)._data[k] ?? null },
  setItem(k: string, v: string) { (this as any)._data[k] = v },
  removeItem(k: string) { delete (this as any)._data[k] },
  clear() { (this as any)._data = {} },
})

// ---- 动态导入 ----

async function importModule() {
  return await import('../index')
}

// ---- 辅助函数 ----

function seedLocalStorage(prefix: string, count: number) {
  for (let i = 0; i < count; i++) {
    localStorage.setItem(`${prefix}_key_${i}`, JSON.stringify({ id: i, value: `data_${i}` }))
  }
}

// ============================================================
// P24-6 数据主权测试
// ============================================================

describe('P24-6 数据主权', () => {
  let mod: Awaited<ReturnType<typeof importModule>>

  // ---- 空状态 ----
  describe('空状态', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      localStorage.clear()
      mod = await importModule()
    })

    describe('FORGET_METHODS', () => {
      it('包含 5 种遗忘方法', () => {
        expect(mod.FORGET_METHODS.length).toBe(5)
      })

      it('方法 ID 不重复', () => {
        const ids = mod.FORGET_METHODS.map(m => m.id)
        expect(new Set(ids).size).toBe(ids.length)
      })

      it('seal 和 hibernate 可逆', () => {
        const seal = mod.FORGET_METHODS.find(m => m.id === 'seal')
        const hibernate = mod.FORGET_METHODS.find(m => m.id === 'hibernate')
        expect(seal!.reversible).toBe(true)
        expect(hibernate!.reversible).toBe(true)
      })

      it('natural-aging / release / forgetting-ritual 不可逆', () => {
        const irreversible = mod.FORGET_METHODS.filter(m =>
          ['natural-aging', 'release', 'forgetting-ritual'].includes(m.id)
        )
        for (const m of irreversible) {
          expect(m.reversible).toBe(false)
        }
      })

      it('forgetting-ritual 需要仪式', () => {
        const ritual = mod.FORGET_METHODS.find(m => m.id === 'forgetting-ritual')
        expect(ritual!.needsRitual).toBe(true)
      })
    })

    describe('HALL_EXIT_STATES', () => {
      it('包含 6 种退出状态', () => {
        expect(mod.HALL_EXIT_STATES.length).toBe(6)
      })

      it('状态 ID 不重复', () => {
        const ids = mod.HALL_EXIT_STATES.map(s => s.id)
        expect(new Set(ids).size).toBe(ids.length)
      })

      it('每个状态有 poem 和 color', () => {
        for (const s of mod.HALL_EXIT_STATES) {
          expect(s.poem).toBeTruthy()
          expect(s.color).toMatch(/^#[0-9a-f]{6}$/)
          expect(s.transitionDuration).toBeGreaterThan(0)
        }
      })
    })

    describe('getSovereigntyConfig', () => {
      it('返回默认配置', () => {
        const config = mod.getSovereigntyConfig()
        expect(config.value.defaultForgetMethod).toBe('release')
        expect(config.value.naturalAgingDays).toBe(90)
      })
    })

    describe('getForgettingRecords', () => {
      it('初始为空', () => {
        const records = mod.getForgettingRecords()
        expect(records.value.length).toBe(0)
      })
    })

    describe('getForgetMethodInfo', () => {
      it('返回指定方法信息', () => {
        const info = mod.getForgetMethodInfo('seal')
        expect(info.id).toBe('seal')
        expect(info.reversible).toBe(true)
      })

      it('未知方法返回默认(release)', () => {
        const info = mod.getForgetMethodInfo('unknown' as ForgetMethod)
        expect(info.id).toBe('release')
      })
    })

    describe('getHallExitStateInfo', () => {
      it('返回指定状态信息', () => {
        const info = mod.getHallExitStateInfo('peaceful')
        expect(info.id).toBe('peaceful')
        expect(info.poem).toBeTruthy()
      })

      it('未知状态返回默认(peaceful)', () => {
        const info = mod.getHallExitStateInfo('unknown' as any)
        expect(info.id).toBe('peaceful')
      })
    })
  })

  // ---- 配置管理 ----
  describe('配置管理', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      localStorage.clear()
      mod = await importModule()
    })

    describe('updateSovereigntyConfig', () => {
      it('部分更新配置', () => {
        mod.updateSovereigntyConfig({ naturalAgingDays: 180 })
        expect(mod.getSovereigntyConfig().value.naturalAgingDays).toBe(180)
      })

      it('保留未修改字段', () => {
        mod.updateSovereigntyConfig({ naturalAgingDays: 180 })
        expect(mod.getSovereigntyConfig().value.sealRetentionDays).toBe(365)
      })

      it('持久化到 storage', () => {
        mod.updateSovereigntyConfig({ deviceName: '测试' } as any)
        const store = getKvStore()
        expect(store['hf:sovereignty_config']).toBeDefined()
      })
    })

    describe('resetSovereigntyConfig', () => {
      it('重置为默认值', () => {
        mod.updateSovereigntyConfig({ naturalAgingDays: 999 })
        mod.resetSovereigntyConfig()
        expect(mod.getSovereigntyConfig().value.naturalAgingDays).toBe(90)
      })
    })
  })

  // ---- 老化标记 ----
  describe('老化标记', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      localStorage.clear()
      mod = await importModule()
    })

    describe('setAgingMark', () => {
      it('创建新标记', () => {
        mod.setAgingMark('module_test')
        const mark = mod.getModuleAgingMark('module_test')
        expect(mark).toBeDefined()
        expect(mark!.decayLevel).toBe(0)
      })

      it('刷新已存在标记', () => {
        mod.setAgingMark('module_test')
        const firstMark = mod.getModuleAgingMark('module_test')!
        // 等待一小段时间后刷新
        mod.setAgingMark('module_test')
        const secondMark = mod.getModuleAgingMark('module_test')!
        expect(secondMark.lastAccessedAt).toBeGreaterThanOrEqual(firstMark.lastAccessedAt)
      })
    })

    describe('removeAgingMark', () => {
      it('移除标记', () => {
        mod.setAgingMark('module_test')
        mod.removeAgingMark('module_test')
        expect(mod.getModuleAgingMark('module_test')).toBeUndefined()
      })
    })

    describe('calculateAgingProgress', () => {
      it('无标记返回 0', () => {
        expect(mod.calculateAgingProgress('nonexistent')).toBe(0)
      })

      it('刚创建标记进度为 0', () => {
        mod.setAgingMark('module_test')
        // 进度取决于时间差，刚创建应该是 0 或接近 0
        const progress = mod.calculateAgingProgress('module_test')
        expect(progress).toBe(0)
      })
    })
  })

  // ---- 模块数据操作 ----
  describe('模块数据操作', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      localStorage.clear()
      mod = await importModule()
    })

    describe('getModuleData', () => {
      it('按 prefix 扫描数据', () => {
        seedLocalStorage('test_prefix', 3)
        const data = mod.getModuleData('test_prefix')
        expect(Object.keys(data).length).toBe(3)
      })

      it('不匹配 prefix 的数据不返回', () => {
        seedLocalStorage('test_prefix', 2)
        seedLocalStorage('other_prefix', 3)
        const data = mod.getModuleData('test_prefix')
        expect(Object.keys(data).length).toBe(2)
      })
    })

    describe('deleteModuleData', () => {
      it('删除匹配 prefix 的数据', () => {
        seedLocalStorage('del_test', 5)
        const result = mod.deleteModuleData('del_test')
        expect(result.affectedCount).toBe(5)
        expect(mod.getModuleData('del_test')).toEqual({})
      })

      it('返回 freedBytes', () => {
        seedLocalStorage('del_test', 3)
        const result = mod.deleteModuleData('del_test')
        expect(result.freedBytes).toBeGreaterThan(0)
      })
    })
  })

  // ---- 封存/休眠 ----
  describe('封存/休眠', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      localStorage.clear()
      mod = await importModule()
    })

    describe('sealModuleData', () => {
      it('封存数据后原数据被删除', () => {
        seedLocalStorage('seal_test', 3)
        const sealed = mod.sealModuleData('seal_test', 'seal_test')
        expect(sealed.id.startsWith('seal-')).toBe(true)
        expect(sealed.encrypted).toBe(true)
        expect(mod.getModuleData('seal_test')).toEqual({})
      })

      it('封存数据设置过期时间', () => {
        seedLocalStorage('seal_test', 1)
        const sealed = mod.sealModuleData('seal_test', 'seal_test')
        const expectedExpiry = Date.now() + 365 * 86400000
        expect(sealed.expiresAt).toBeGreaterThan(Date.now())
        expect(sealed.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000)
      })
    })

    describe('unsealModuleData', () => {
      it('恢复封存数据', () => {
        seedLocalStorage('seal_test', 2)
        const sealed = mod.sealModuleData('seal_test', 'seal_test')
        const result = mod.unsealModuleData(sealed.id)
        expect(result).toBe(true)
        expect(Object.keys(mod.getModuleData('seal_test')).length).toBe(2)
      })

      it('不存在的封存 ID 返回 false', () => {
        expect(mod.unsealModuleData('nonexistent')).toBe(false)
      })
    })

    describe('hibernateModuleData', () => {
      it('休眠数据有压缩尺寸', () => {
        seedLocalStorage('hibernate_test', 3)
        const hibernated = mod.hibernateModuleData('hibernate_test', 'hibernate_test')
        expect(hibernated.compressedSize).toBeGreaterThan(0)
        expect(hibernated.compressedSize).toBeLessThan(hibernated.originalSize)
      })

      it('休眠后原数据被删除', () => {
        seedLocalStorage('hibernate_test', 2)
        mod.hibernateModuleData('hibernate_test', 'hibernate_test')
        expect(mod.getModuleData('hibernate_test')).toEqual({})
      })
    })

    describe('wakeModuleData', () => {
      it('恢复休眠数据', () => {
        seedLocalStorage('hibernate_test', 2)
        const hibernated = mod.hibernateModuleData('hibernate_test', 'hibernate_test')
        const result = mod.wakeModuleData(hibernated.id)
        expect(result).toBe(true)
        expect(Object.keys(mod.getModuleData('hibernate_test')).length).toBe(2)
      })

      it('不存在的休眠 ID 返回 false', () => {
        expect(mod.wakeModuleData('nonexistent')).toBe(false)
      })
    })

    describe('getSealedDataList', () => {
      it('返回未过期的封存数据', () => {
        seedLocalStorage('seal_test', 1)
        mod.sealModuleData('seal_test', 'seal_test')
        const list = mod.getSealedDataList()
        expect(list.length).toBe(1)
      })
    })

    describe('getHibernatedDataList', () => {
      it('返回未过期的休眠数据', () => {
        seedLocalStorage('hibernate_test', 1)
        mod.hibernateModuleData('hibernate_test', 'hibernate_test')
        const list = mod.getHibernatedDataList()
        expect(list.length).toBe(1)
      })
    })
  })

  // ---- 遗忘执行 ----
  describe('遗忘执行', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      vi.resetModules()
      resetKvStore()
      localStorage.clear()
      mod = await importModule()
    })

    describe('natural-aging', () => {
      it('设置老化标记', () => {
        seedLocalStorage('aging_test', 3)
        const result = mod.executeForgetting('aging_test', '测试模块', 'aging_test', 'natural-aging')
        expect(result.success).toBe(true)
        expect(result.method).toBe('natural-aging')
        expect(result.record.recoverable).toBe(false)
        // 数据仍在
        expect(Object.keys(mod.getModuleData('aging_test')).length).toBe(3)
      })
    })

    describe('seal', () => {
      it('封存数据并记录', () => {
        seedLocalStorage('seal_test', 3)
        const result = mod.executeForgetting('seal_test', '测试模块', 'seal_test', 'seal')
        expect(result.success).toBe(true)
        expect(result.record.recoverable).toBe(true)
        expect(result.record.recoverableUntil).toBeDefined()
        // 数据已删除
        expect(mod.getModuleData('seal_test')).toEqual({})
      })
    })

    describe('release', () => {
      it('彻底删除数据', () => {
        seedLocalStorage('release_test', 5)
        const result = mod.executeForgetting('release_test', '测试模块', 'release_test', 'release')
        expect(result.success).toBe(true)
        expect(result.record.recoverable).toBe(false)
        expect(result.affectedCount).toBe(5)
        expect(mod.getModuleData('release_test')).toEqual({})
      })
    })

    describe('hibernate', () => {
      it('休眠数据并记录', () => {
        seedLocalStorage('hibernate_test', 3)
        const result = mod.executeForgetting('hibernate_test', '测试模块', 'hibernate_test', 'hibernate')
        expect(result.success).toBe(true)
        expect(result.record.recoverable).toBe(true)
        expect(result.freedBytes).toBeGreaterThan(0)
      })
    })

    describe('forgetting-ritual', () => {
      it('仪式化删除数据', () => {
        seedLocalStorage('ritual_test', 3)
        const result = mod.executeForgetting('ritual_test', '测试模块', 'ritual_test', 'forgetting-ritual')
        expect(result.success).toBe(true)
        expect(result.record.recoverable).toBe(false)
        expect(mod.getModuleData('ritual_test')).toEqual({})
      })
    })

    describe('记录管理', () => {
      it('执行遗忘后添加记录', () => {
        seedLocalStorage('record_test', 2)
        mod.executeForgetting('record_test', '记录模块', 'record_test', 'release')
        const records = mod.getForgettingRecords()
        expect(records.value.length).toBe(1)
        expect(records.value[0].moduleKey).toBe('record_test')
      })

      it('getModuleForgettingRecords 按模块筛选', () => {
        seedLocalStorage('mod_a', 1)
        seedLocalStorage('mod_b', 1)
        mod.executeForgetting('mod_a', 'A', 'mod_a', 'release')
        mod.executeForgetting('mod_b', 'B', 'mod_b', 'release')
        const aRecords = mod.getModuleForgettingRecords('mod_a')
        expect(aRecords.length).toBe(1)
        expect(aRecords[0].moduleKey).toBe('mod_a')
      })
    })
  })
})