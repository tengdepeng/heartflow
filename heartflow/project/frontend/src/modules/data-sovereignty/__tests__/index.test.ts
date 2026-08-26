// ============================================================
// 数据主权模块 · index.ts 测试
// 覆盖：常量、纯函数、遗忘引擎
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ============================================================
// Mock localStorage
// ============================================================
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// ============================================================
// Mock storage engine
// ============================================================
const storageData: Record<string, any> = {}
const mockStorage = {
  getKV: vi.fn((key: string, defaultValue: any) => {
    return storageData[key] !== undefined ? storageData[key] : defaultValue
  }),
  setKV: vi.fn((key: string, value: any) => {
    storageData[key] = value
  }),
}

vi.mock('../../../engine/storage', () => ({
  storage: mockStorage,
}))

// ============================================================
// 动态导入（在 mock 设置之后）
// ============================================================
let sovereignty: any

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  localStorageMock.clear()
  // 清空 storage 模拟数据
  for (const k of Object.keys(storageData)) delete storageData[k]
  // 重新导入模块以重置响应式状态
  sovereignty = await import('../index')
})

// ============================================================
// 1. 常量测试
// ============================================================
describe('FORGET_METHODS 常量', () => {
  it('包含 5 种遗忘方法', () => {
    expect(sovereignty.FORGET_METHODS).toHaveLength(5)
  })

  it('每种方法都有 id/label/icon/description', () => {
    sovereignty.FORGET_METHODS.forEach((m: any) => {
      expect(m.id).toBeTruthy()
      expect(m.label).toBeTruthy()
      expect(m.icon).toBeTruthy()
      expect(m.description).toBeTruthy()
    })
  })

  it('natural-aging 不可逆', () => {
    const m = sovereignty.FORGET_METHODS.find((x: any) => x.id === 'natural-aging')
    expect(m.reversible).toBe(false)
    expect(m.needsRitual).toBe(false)
  })

  it('seal 可逆', () => {
    const m = sovereignty.FORGET_METHODS.find((x: any) => x.id === 'seal')
    expect(m.reversible).toBe(true)
    expect(m.needsRitual).toBe(false)
  })

  it('release 不可逆', () => {
    const m = sovereignty.FORGET_METHODS.find((x: any) => x.id === 'release')
    expect(m.reversible).toBe(false)
    expect(m.needsRitual).toBe(false)
  })

  it('hibernate 可逆', () => {
    const m = sovereignty.FORGET_METHODS.find((x: any) => x.id === 'hibernate')
    expect(m.reversible).toBe(true)
    expect(m.needsRitual).toBe(false)
  })

  it('forgetting-ritual 需要仪式', () => {
    const m = sovereignty.FORGET_METHODS.find((x: any) => x.id === 'forgetting-ritual')
    expect(m.needsRitual).toBe(true)
    expect(m.reversible).toBe(false)
  })
})

describe('HALL_EXIT_STATES 常量', () => {
  it('包含 6 种退出状态', () => {
    expect(sovereignty.HALL_EXIT_STATES).toHaveLength(6)
  })

  it('每种状态都有 id/label/icon/poem/description/color/transitionDuration', () => {
    sovereignty.HALL_EXIT_STATES.forEach((s: any) => {
      expect(s.id).toBeTruthy()
      expect(s.label).toBeTruthy()
      expect(s.icon).toBeTruthy()
      expect(s.poem).toBeTruthy()
      expect(s.description).toBeTruthy()
      expect(s.color).toBeTruthy()
      expect(typeof s.transitionDuration).toBe('number')
    })
  })

  it('peaceful 是默认状态（索引 0）', () => {
    expect(sovereignty.HALL_EXIT_STATES[0].id).toBe('peaceful')
  })

  it('transformative 过渡时间最长', () => {
    const durations = sovereignty.HALL_EXIT_STATES.map((s: any) => s.transitionDuration)
    const maxDuration = Math.max(...durations)
    const transformative = sovereignty.HALL_EXIT_STATES.find((s: any) => s.id === 'transformative')
    expect(transformative.transitionDuration).toBe(maxDuration)
  })
})

// ============================================================
// 2. getForgetMethodInfo
// ============================================================
describe('getForgetMethodInfo', () => {
  it('返回正确的遗忘方法信息', () => {
    const info = sovereignty.getForgetMethodInfo('release')
    expect(info.id).toBe('release')
    expect(info.label).toBe('彻底释放')
  })

  it('未知方法返回默认 release', () => {
    const info = sovereignty.getForgetMethodInfo('unknown' as any)
    expect(info.id).toBe('release')
  })
})

// ============================================================
// 3. getHallExitStateInfo
// ============================================================
describe('getHallExitStateInfo', () => {
  it('返回正确的退出状态信息', () => {
    const info = sovereignty.getHallExitStateInfo('satisfied')
    expect(info.id).toBe('satisfied')
    expect(info.label).toBe('心满意足')
  })

  it('未知状态返回默认 peaceful', () => {
    const info = sovereignty.getHallExitStateInfo('unknown' as any)
    expect(info.id).toBe('peaceful')
  })
})

// ============================================================
// 4. 配置管理
// ============================================================
describe('配置管理', () => {
  it('getSovereigntyConfig 返回响应式配置', () => {
    const config = sovereignty.getSovereigntyConfig()
    expect(config.value).toBeDefined()
    expect(config.value.defaultForgetMethod).toBe('release')
    expect(config.value.naturalAgingDays).toBe(90)
    expect(config.value.sealRetentionDays).toBe(365)
    expect(config.value.hibernateRetentionDays).toBe(180)
    expect(config.value.forgettingRecordRetentionDays).toBe(30)
    expect(config.value.ritualAnimationEnabled).toBe(true)
    expect(config.value.preferredExitState).toBe('peaceful')
    expect(config.value.exitTransitionEnabled).toBe(true)
  })

  it('updateSovereigntyConfig 更新配置并持久化', () => {
    sovereignty.updateSovereigntyConfig({ naturalAgingDays: 60 })
    const config = sovereignty.getSovereigntyConfig()
    expect(config.value.naturalAgingDays).toBe(60)
    // 验证持久化
    expect(mockStorage.setKV).toHaveBeenCalled()
  })

  it('resetSovereigntyConfig 恢复默认配置', () => {
    sovereignty.updateSovereigntyConfig({ naturalAgingDays: 60 })
    sovereignty.resetSovereigntyConfig()
    const config = sovereignty.getSovereigntyConfig()
    expect(config.value.naturalAgingDays).toBe(90)
  })
})

// ============================================================
// 5. 遗忘记录管理
// ============================================================
describe('遗忘记录管理', () => {
  it('初始记录为空', () => {
    const records = sovereignty.getForgettingRecords()
    expect(records.value).toEqual([])
  })

  it('addForgettingRecord 添加记录', () => {
    const record = {
      id: 'test-1',
      moduleKey: 'notes',
      moduleName: '笔记',
      method: 'release' as const,
      timestamp: Date.now(),
      affectedCount: 5,
      freedBytes: 1024,
      recoverable: false,
    }
    sovereignty.addForgettingRecord(record)
    const records = sovereignty.getForgettingRecords()
    expect(records.value).toHaveLength(1)
    expect(records.value[0].id).toBe('test-1')
  })

  it('getModuleForgettingRecords 按模块筛选', () => {
    sovereignty.addForgettingRecord({
      id: 'test-1', moduleKey: 'notes', moduleName: '笔记',
      method: 'release', timestamp: Date.now(),
      affectedCount: 5, freedBytes: 1024, recoverable: false,
    })
    sovereignty.addForgettingRecord({
      id: 'test-2', moduleKey: 'timeline', moduleName: '时间线',
      method: 'seal', timestamp: Date.now(),
      affectedCount: 3, freedBytes: 512, recoverable: true,
    })
    const notesRecords = sovereignty.getModuleForgettingRecords('notes')
    expect(notesRecords).toHaveLength(1)
    expect(notesRecords[0].moduleKey).toBe('notes')
  })
})

// ============================================================
// 6. 自然老化标记
// ============================================================
describe('自然老化标记', () => {
  it('setAgingMark 创建新标记', () => {
    sovereignty.setAgingMark('notes')
    const mark = sovereignty.getModuleAgingMark('notes')
    expect(mark).toBeDefined()
    expect(mark.moduleKey).toBe('notes')
    expect(mark.decayLevel).toBe(0)
  })

  it('setAgingMark 更新已有标记', () => {
    sovereignty.setAgingMark('notes')
    const firstMark = sovereignty.getModuleAgingMark('notes')
    sovereignty.setAgingMark('notes')
    const secondMark = sovereignty.getModuleAgingMark('notes')
    expect(secondMark.lastAccessedAt).toBeGreaterThanOrEqual(firstMark.lastAccessedAt)
    expect(secondMark.decayLevel).toBe(0)
  })

  it('removeAgingMark 移除标记', () => {
    sovereignty.setAgingMark('notes')
    sovereignty.removeAgingMark('notes')
    const mark = sovereignty.getModuleAgingMark('notes')
    expect(mark).toBeUndefined()
  })

  it('calculateAgingProgress 计算老化进度', () => {
    // 设置 90 天前最后访问
    sovereignty.setAgingMark('notes')
    // 模拟 elapsed 为 45 天
    const mark = sovereignty.getModuleAgingMark('notes')
    // 修改 lastAccessedAt 为 45 天前
    mark.lastAccessedAt = Date.now() - 45 * 86400000
    const progress = sovereignty.calculateAgingProgress('notes')
    expect(progress).toBe(50) // 45/90 = 50%
  })

  it('calculateAgingProgress 未知模块返回 0', () => {
    const progress = sovereignty.calculateAgingProgress('unknown')
    expect(progress).toBe(0)
  })
})

// ============================================================
// 7. localStorage 操作
// ============================================================
describe('localStorage 操作', () => {
  beforeEach(() => {
    localStorage.setItem('hf:test:a', JSON.stringify({ value: 1 }))
    localStorage.setItem('hf:test:b', JSON.stringify({ value: 2 }))
    localStorage.setItem('hf:other:x', 'not json')
  })

  it('getModuleData 按 prefix 获取数据', () => {
    const data = sovereignty.getModuleData('hf:test:')
    expect(Object.keys(data)).toHaveLength(2)
    expect(data['hf:test:a']).toEqual({ value: 1 })
    expect(data['hf:test:b']).toEqual({ value: 2 })
  })

  it('getModuleData 处理非 JSON 数据', () => {
    const data = sovereignty.getModuleData('hf:other:')
    expect(data['hf:other:x']).toBe('not json')
  })

  it('deleteModuleData 删除数据并返回统计', () => {
    const result = sovereignty.deleteModuleData('hf:test:')
    expect(result.affectedCount).toBe(2)
    expect(result.freedBytes).toBeGreaterThan(0)
    // 验证数据已删除
    const data = sovereignty.getModuleData('hf:test:')
    expect(Object.keys(data)).toHaveLength(0)
  })
})

// ============================================================
// 8. 封存操作
// ============================================================
describe('封存操作', () => {
  beforeEach(() => {
    localStorage.setItem('hf:seal:a', JSON.stringify({ value: 1 }))
    localStorage.setItem('hf:seal:b', JSON.stringify({ value: 2 }))
    // 重置配置
    sovereignty.resetSovereigntyConfig()
  })

  it('sealModuleData 封存数据', () => {
    const sealed = sovereignty.sealModuleData('test-module', 'hf:seal:')
    expect(sealed.moduleKey).toBe('test-module')
    expect(sealed.encrypted).toBe(true)
    expect(Object.keys(sealed.data)).toHaveLength(2)
    expect(sealed.expiresAt).toBeGreaterThan(Date.now())

    // 原数据应被删除
    const data = sovereignty.getModuleData('hf:seal:')
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('getSealedDataList 返回未过期的封存数据', () => {
    sovereignty.sealModuleData('test-module', 'hf:seal:')
    const list = sovereignty.getSealedDataList()
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list[0].moduleKey).toBe('test-module')
  })

  it('unsealModuleData 恢复封存数据', () => {
    const sealed = sovereignty.sealModuleData('test-module', 'hf:seal:')
    const result = sovereignty.unsealModuleData(sealed.id)
    expect(result).toBe(true)

    // 数据应恢复
    const data = sovereignty.getModuleData('hf:seal:')
    expect(Object.keys(data)).toHaveLength(2)
  })

  it('unsealModuleData 不存在的封存返回 false', () => {
    const result = sovereignty.unsealModuleData('nonexistent')
    expect(result).toBe(false)
  })
})

// ============================================================
// 9. 休眠操作
// ============================================================
describe('休眠操作', () => {
  beforeEach(() => {
    localStorage.setItem('hf:hibernate:a', JSON.stringify({ value: 'long text here' }))
    sovereignty.resetSovereigntyConfig()
  })

  it('hibernateModuleData 休眠数据', () => {
    const hibernated = sovereignty.hibernateModuleData('test-module', 'hf:hibernate:')
    expect(hibernated.moduleKey).toBe('test-module')
    expect(hibernated.compressedSize).toBeLessThan(hibernated.originalSize)
    expect(hibernated.expiresAt).toBeGreaterThan(Date.now())

    // 原数据应被删除
    const data = sovereignty.getModuleData('hf:hibernate:')
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('getHibernatedDataList 返回未过期的休眠数据', () => {
    sovereignty.hibernateModuleData('test-module', 'hf:hibernate:')
    const list = sovereignty.getHibernatedDataList()
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list[0].moduleKey).toBe('test-module')
  })

  it('wakeModuleData 恢复休眠数据', () => {
    const hibernated = sovereignty.hibernateModuleData('test-module', 'hf:hibernate:')
    const result = sovereignty.wakeModuleData(hibernated.id)
    expect(result).toBe(true)

    // 数据应恢复
    const data = sovereignty.getModuleData('hf:hibernate:')
    expect(Object.keys(data)).toHaveLength(1)
  })

  it('wakeModuleData 不存在的休眠返回 false', () => {
    const result = sovereignty.wakeModuleData('nonexistent')
    expect(result).toBe(false)
  })
})

// ============================================================
// 10. executeForgetting 统一入口
// ============================================================
describe('executeForgetting 统一入口', () => {
  beforeEach(() => {
    localStorage.setItem('hf:forget:a', JSON.stringify({ value: 1 }))
    localStorage.setItem('hf:forget:b', JSON.stringify({ value: 'test' }))
    sovereignty.resetSovereigntyConfig()
  })

  it('natural-aging 方法', () => {
    const result = sovereignty.executeForgetting('notes', '笔记', 'hf:forget:', 'natural-aging')
    expect(result.success).toBe(true)
    expect(result.method).toBe('natural-aging')
    expect(result.record.recoverable).toBe(false)

    // 应设置老化标记
    const mark = sovereignty.getModuleAgingMark('notes')
    expect(mark).toBeDefined()
  })

  it('seal 方法', () => {
    const result = sovereignty.executeForgetting('notes', '笔记', 'hf:forget:', 'seal')
    expect(result.success).toBe(true)
    expect(result.method).toBe('seal')
    expect(result.record.recoverable).toBe(true)
    expect(result.record.recoverableUntil).toBeGreaterThan(Date.now())

    // 原数据应被删除（封存）
    const data = sovereignty.getModuleData('hf:forget:')
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('release 方法', () => {
    const result = sovereignty.executeForgetting('notes', '笔记', 'hf:forget:', 'release')
    expect(result.success).toBe(true)
    expect(result.method).toBe('release')
    expect(result.record.recoverable).toBe(false)
    expect(result.affectedCount).toBe(2)

    // 原数据应被删除
    const data = sovereignty.getModuleData('hf:forget:')
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('hibernate 方法', () => {
    const result = sovereignty.executeForgetting('notes', '笔记', 'hf:forget:', 'hibernate')
    expect(result.success).toBe(true)
    expect(result.method).toBe('hibernate')
    expect(result.record.recoverable).toBe(true)

    // 原数据应被删除（休眠）
    const data = sovereignty.getModuleData('hf:forget:')
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('forgetting-ritual 方法', () => {
    const result = sovereignty.executeForgetting('notes', '笔记', 'hf:forget:', 'forgetting-ritual')
    expect(result.success).toBe(true)
    expect(result.method).toBe('forgetting-ritual')
    expect(result.record.recoverable).toBe(false)
  })

  it('添加遗忘记录', () => {
    sovereignty.executeForgetting('notes', '笔记', 'hf:forget:', 'release')
    const records = sovereignty.getForgettingRecords()
    expect(records.value.length).toBeGreaterThanOrEqual(1)
    expect(records.value[0].moduleKey).toBe('notes')
  })

  it('记录包含 moduleName', () => {
    const result = sovereignty.executeForgetting('test-key', '测试模块', 'hf:forget:', 'release')
    expect(result.moduleName).toBe('测试模块')
    expect(result.record.moduleName).toBe('测试模块')
  })
})