// ============================================================
// 介质呼吸模块 · 测试
// ============================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('breathing 模块', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({})),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function fresh() {
    const mod = await import('../index')
    // useBreathing 依赖 onMounted，但单元测试中不会执行
    const br = mod.useBreathing()
    return br
  }

  it('导出 useBreathing 函数', async () => {
    vi.useFakeTimers()
    const mod = await import('../index')
    expect(typeof mod.useBreathing).toBe('function')
    vi.useRealTimers()
  }, 20000)

  it('useBreathing 返回预期 API', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    expect(br.phase).toBeDefined()
    expect(br.mood).toBeDefined()
    expect(br.isPresent).toBeDefined()
    expect(typeof br.pulse).toBe('function')
    expect(typeof br.setMood).toBe('function')
    vi.useRealTimers()
  })

  it('初始化 mood 为 calm', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    expect(br.mood.value).toBe('calm')
    vi.useRealTimers()
  })

  it('setMood 可以手动切换状态', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    br.setMood('present')
    expect(br.mood.value).toBe('present')
    br.setMood('focusing')
    expect(br.mood.value).toBe('focusing')
    br.setMood('calm')
    expect(br.mood.value).toBe('calm')
    vi.useRealTimers()
  })

  it('pulse 将 mood 切换为 pulsing', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    br.pulse()
    expect(br.mood.value).toBe('pulsing')
    vi.useRealTimers()
  })

  it('pulse 在 pulseDuration 后恢复', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    br.pulse()
    expect(br.mood.value).toBe('pulsing')
    // 前进 pulseDuration (3000ms) + 一点点
    vi.advanceTimersByTime(3000)
    // 已恢复为 present（因为 pulse 后无 focusMode）
    expect(br.mood.value).toBe('present')
    vi.useRealTimers()
  })

  it('phase 包含 mood 和 styleVars', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    expect(br.phase.value.mood).toBe('calm')
    expect(br.phase.value.styleVars).toBeDefined()
    expect(br.phase.value.styleVars['--br-cycle-ms']).toBe('8000ms')
    vi.useRealTimers()
  })

  it('pulsing 状态的 styleVars 周期短', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    br.pulse()
    expect(br.phase.value.styleVars['--br-cycle-ms']).toBe('1500ms')
    vi.useRealTimers()
  })

  it('focusing 状态的 styleVars 周期长', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    br.setMood('focusing')
    expect(br.phase.value.styleVars['--br-cycle-ms']).toBe('12000ms')
    vi.useRealTimers()
  })

  it('pulse 后 setMood 可覆盖恢复', async () => {
    vi.useFakeTimers()
    const br = await fresh()
    br.pulse()
    expect(br.mood.value).toBe('pulsing')
    // 在恢复前手动设置
    br.setMood('focusing')
    vi.advanceTimersByTime(3000)
    // 不应被 pulse 的定时器覆盖
    expect(br.mood.value).toBe('focusing')
    vi.useRealTimers()
  })
})