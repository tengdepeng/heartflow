// ============================================================
// useTimer composable 测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
}

describe('useTimerUI', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const mock = createMockStorage()
    ;(globalThis as any).localStorage = mock
    ;(globalThis as any).window = {
      matchMedia: () => ({ matches: false }),
      setInterval: vi.fn(() => 123),
      clearInterval: vi.fn(),
    } as any
  })

  async function fresh() {
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
    const { useTimerUI } = await import('../useTimer')
    return useTimerUI()
  }

  describe('初始状态', () => {
    it('初始时 isIdle 为 true', async () => {
      const ui = await fresh()
      expect(ui.isIdle.value).toBe(true)
    })

    it('初始时 isFocusing 为 false', async () => {
      const ui = await fresh()
      expect(ui.isFocusing.value).toBe(false)
    })

    it('初始时 isPaused 为 false', async () => {
      const ui = await fresh()
      expect(ui.isPaused.value).toBe(false)
    })

    it('初始时 isCompleted 为 false', async () => {
      const ui = await fresh()
      expect(ui.isCompleted.value).toBe(false)
    })

    it('初始时 display 为 00:00', async () => {
      const ui = await fresh()
      expect(ui.display.value).toBe('00:00')
    })

    it('初始时 progress 为 0', async () => {
      const ui = await fresh()
      expect(ui.progress.value).toBe(0)
    })

    it('初始时 todayCompletedCount 为 0', async () => {
      const ui = await fresh()
      expect(ui.todayCompletedCount.value).toBe(0)
    })
  })

  describe('动作转发', () => {
    it('setMode 为函数', async () => {
      const ui = await fresh()
      expect(typeof ui.setMode).toBe('function')
    })

    it('start 为函数', async () => {
      const ui = await fresh()
      expect(typeof ui.start).toBe('function')
    })

    it('pause 为函数', async () => {
      const ui = await fresh()
      expect(typeof ui.pause).toBe('function')
    })

    it('resume 为函数', async () => {
      const ui = await fresh()
      expect(typeof ui.resume).toBe('function')
    })

    it('finish 为函数', async () => {
      const ui = await fresh()
      expect(typeof ui.finish).toBe('function')
    })

    it('interrupt 为函数', async () => {
      const ui = await fresh()
      expect(typeof ui.interrupt).toBe('function')
    })

    it('reset 为函数', async () => {
      const ui = await fresh()
      expect(typeof ui.reset).toBe('function')
    })
  })

  describe('toggle 行为', () => {
    it('toggle 在 idle 状态下启动计时', async () => {
      const ui = await fresh()
      expect(ui.isIdle.value).toBe(true)
      ui.toggle()
      expect(ui.isFocusing.value).toBe(true)
    })

    it('toggle 在 isFocusing 状态下暂停计时', async () => {
      const ui = await fresh()
      ui.start()
      expect(ui.isFocusing.value).toBe(true)
      ui.toggle()
      expect(ui.isPaused.value).toBe(true)
    })
  })

  describe('stop 行为', () => {
    it('stop 在 focusing 时中断计时', async () => {
      const ui = await fresh()
      ui.start()
      expect(ui.isFocusing.value).toBe(true)
      ui.stop()
      expect(ui.isFocusing.value).toBe(false)
      expect(ui.isPaused.value).toBe(false)
    })

    it('stop 在 idle 时不做任何事', async () => {
      const ui = await fresh()
      expect(ui.isIdle.value).toBe(true)
      ui.stop()
      expect(ui.isIdle.value).toBe(true)
    })
  })
})