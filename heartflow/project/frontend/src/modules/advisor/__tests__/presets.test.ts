import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DEFAULT_ADVISOR_PRESETS, isPresetAdvisorId } from '../presets'
import { storage } from '../../../engine/storage'

function setupMemoryStorage() {
  const mem = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
      removeItem: (k: string) => { mem.delete(k) },
    },
    configurable: true,
  })
  storage.clear()
}

describe('6 类固定幕僚预设', () => {
  beforeEach(() => setupMemoryStorage())

  it('恰有 6 个固定幕僚，id 稳定且唯一', () => {
    expect(DEFAULT_ADVISOR_PRESETS).toHaveLength(6)
    const ids = DEFAULT_ADVISOR_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(6)
    for (const id of ids) {
      expect(id.startsWith('preset-')).toBe(true)
      expect(isPresetAdvisorId(id)).toBe(true)
    }
  })

  it('每个预设含中文名与职责描述', () => {
    const names = DEFAULT_ADVISOR_PRESETS.map(p => p.name)
    expect(names).toEqual(['镜我', '追风', '灵犀', '默渊', '时痕', '守钟人'])
    for (const p of DEFAULT_ADVISOR_PRESETS) {
      expect(p.responsibilities && p.responsibilities.length).toBeGreaterThan(0)
      expect(p.unlocked).toBe(true)
      expect(p.role).toBeTruthy()
      expect(p.personality).toBeTruthy()
    }
  })

  it('store 初始化后 canonically 注入 6 个固定幕僚（幂等，不重复）', async () => {
    setActivePinia(createPinia())
    const { useAdvisorStore } = await import('../../../stores/advisor')
    useAdvisorStore() // 触发 setup → ensureDefaultAdvisors()

    const stored = storage.getAdvisors()
    const presetCount = stored.filter(a => isPresetAdvisorId(a.id)).length
    expect(presetCount).toBe(6)

    // 再次实例化（模拟重载）不重复注入
    const advisor2 = useAdvisorStore()
    advisor2.ensureDefaultAdvisors()
    expect(storage.getAdvisors().filter(a => isPresetAdvisorId(a.id)).length).toBe(6)
  })

  it('不覆盖用户已自定义幕僚', async () => {
    // 预置一个用户幕僚
    storage.setAdvisors([{
      id: 'user-1', name: '我的伙伴', role: 'guardian', personality: 'caring',
      state: 'awake', affinity: 10, level: 1, totalInteractions: 5,
      createdAt: '2026-02-01T00:00:00.000Z', lastActiveAt: null, unlocked: true,
    } as any])
    const before = storage.getAdvisors().length

    setActivePinia(createPinia())
    const { useAdvisorStore } = await import('../../../stores/advisor')
    useAdvisorStore()

    const after = storage.getAdvisors()
    expect(after.length).toBe(before + 6)
    expect(after.find(a => a.id === 'user-1')).toBeDefined()
  })
})
