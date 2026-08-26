// ============================================================
// 画布模块 · 测试
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('canvas 模块', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  async function fresh() {
    const mod = await import('../index')
    return mod.useCanvasRoom()
  }

  it('导出 useCanvasRoom 函数', async () => {
    const mod = await import('../index')
    expect(typeof mod.useCanvasRoom).toBe('function')
  })

  it('useCanvasRoom 返回预期 API', async () => {
    const canvas = await fresh()
    expect(canvas.state).toBeDefined()
    expect(canvas.canvasCrystals).toBeDefined()
    expect(canvas.gravityConfig).toBeDefined()
    expect(canvas.canvasWidth).toBeDefined()
    expect(canvas.canvasHeight).toBeDefined()
    expect(canvas.selectedCrystal).toBeDefined()
    expect(canvas.selectedSession).toBeDefined()
    expect(typeof canvas.setLayoutMode).toBe('function')
    expect(typeof canvas.setCanvasSize).toBe('function')
    expect(typeof canvas.selectCrystal).toBe('function')
    expect(typeof canvas.refresh).toBe('function')
  })

  it('初始 layoutMode 为 gravity', async () => {
    const canvas = await fresh()
    expect(canvas.state.value.layoutMode).toBe('gravity')
  })

  it('setLayoutMode 切换布局模式', async () => {
    const canvas = await fresh()
    canvas.setLayoutMode('grid')
    expect(canvas.state.value.layoutMode).toBe('grid')
    canvas.setLayoutMode('gravity')
    expect(canvas.state.value.layoutMode).toBe('gravity')
  })

  it('setCanvasSize 更新尺寸', async () => {
    const canvas = await fresh()
    canvas.setCanvasSize(1024, 768)
    expect(canvas.canvasWidth.value).toBe(1024)
    expect(canvas.canvasHeight.value).toBe(768)
  })

  it('selectCrystal 更新选中状态', async () => {
    const canvas = await fresh()
    expect(canvas.state.value.selectedCrystalId).toBeNull()
    canvas.selectCrystal('test-id')
    expect(canvas.state.value.selectedCrystalId).toBe('test-id')
    canvas.selectCrystal(null)
    expect(canvas.state.value.selectedCrystalId).toBeNull()
  })

  it('无结晶时 canvasCrystals 为空', async () => {
    const canvas = await fresh()
    expect(canvas.canvasCrystals.value).toEqual([])
  })

  it('无选中时 selectedCrystal 为 null', async () => {
    const canvas = await fresh()
    expect(canvas.selectedCrystal.value).toBeNull()
    expect(canvas.selectedSession.value).toBeNull()
  })

  it('refresh 不报错', async () => {
    const canvas = await fresh()
    expect(() => canvas.refresh()).not.toThrow()
  })
})