// ============================================================
// scene-preset 存储层 · 场景预设 CRUD 测试
// ============================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { BackgroundMediaConfig } from '../../../types'

function makeBg(overrides: Partial<BackgroundMediaConfig> = {}): BackgroundMediaConfig {
  return {
    type: 'image',
    presetScene: 'none',
    dataUrl: null,
    mimeType: null,
    fileName: null,
    updatedAt: null,
    ...overrides,
  }
}

describe('scene-preset storage', () => {
  let mockStore: Record<string, string> = {}

  beforeEach(() => {
    mockStore = {}
    ;(globalThis as any).localStorage = {
      getItem: vi.fn((k: string) => mockStore[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { mockStore[k] = v }),
      removeItem: vi.fn((k: string) => { delete mockStore[k] }),
      clear: vi.fn(() => { mockStore = {} }),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function fresh() {
    const core = await import('../core')
    core.invalidateCache()
    const preset = await import('../scene-preset')
    return { core, preset }
  }

  it('getScenePresets 首次返回空数组', async () => {
    const { preset } = await fresh()
    expect(preset.getScenePresets()).toEqual([])
  })

  it('addScenePreset 添加场景预设', async () => {
    const { preset } = await fresh()
    const bg = makeBg({ dataUrl: 'data:image/jpg;base64,abc', fileName: 'bg.jpg', mimeType: 'image/jpeg' })
    const result = preset.addScenePreset('夜间书房', bg)
    expect(result.name).toBe('夜间书房')
    expect(result.background.type).toBe('image')
    expect(result.background.fileName).toBe('bg.jpg')
    expect(result.id).toBeTruthy()
    expect(result.createdAt).toBeTruthy()
    expect(result.updatedAt).toBeTruthy()
  })

  it('addScenePreset 后 getScenePresets 返回包含新增预设', async () => {
    const { preset } = await fresh()
    preset.addScenePreset('日间庭院', makeBg({ fileName: 'bg1.jpg' }))
    preset.addScenePreset('夜间书房', makeBg({ fileName: 'bg2.jpg' }))
    const all = preset.getScenePresets()
    expect(all.length).toBe(2)
    expect(all[0].name).toBe('日间庭院')
    expect(all[1].name).toBe('夜间书房')
  })

  it('removeScenePreset 删除存在的预设返回 true', async () => {
    const { preset } = await fresh()
    const p = preset.addScenePreset('临时场景', makeBg())
    const ok = preset.removeScenePreset(p.id)
    expect(ok).toBe(true)
    expect(preset.getScenePresets().length).toBe(0)
  })

  it('removeScenePreset 删除不存在的预设返回 false', async () => {
    const { preset } = await fresh()
    const ok = preset.removeScenePreset('nonexistent')
    expect(ok).toBe(false)
  })

  it('renameScenePreset 重命名场景预设', async () => {
    const { preset } = await fresh()
    const p = preset.addScenePreset('旧名称', makeBg())
    const ok = preset.renameScenePreset(p.id, '新名称')
    expect(ok).toBe(true)
    const all = preset.getScenePresets()
    expect(all[0].name).toBe('新名称')
  })

  it('renameScenePreset 重命名不存在的预设返回 false', async () => {
    const { preset } = await fresh()
    const ok = preset.renameScenePreset('nonexistent', '新名称')
    expect(ok).toBe(false)
  })

  it('renameScenePreset 更新 updatedAt', async () => {
    const { preset } = await fresh()
    const p = preset.addScenePreset('场景', makeBg())
    const originalUpdatedAt = p.updatedAt
    await new Promise(r => setTimeout(r, 5))
    preset.renameScenePreset(p.id, '新场景')
    const all = preset.getScenePresets()
    expect(all[0].updatedAt).not.toBe(originalUpdatedAt)
  })

  it('updateScenePresetBackground 更新背景配置', async () => {
    const { preset } = await fresh()
    const p = preset.addScenePreset('场景', makeBg({ fileName: 'old.jpg' }))
    const newBg = makeBg({ type: 'video', fileName: 'new.mp4', mimeType: 'video/mp4' })
    const ok = preset.updateScenePresetBackground(p.id, newBg)
    expect(ok).toBe(true)
    const all = preset.getScenePresets()
    expect(all[0].background.type).toBe('video')
    expect(all[0].background.fileName).toBe('new.mp4')
  })

  it('updateScenePresetBackground 不存在的预设返回 false', async () => {
    const { preset } = await fresh()
    const ok = preset.updateScenePresetBackground('nonexistent', makeBg())
    expect(ok).toBe(false)
  })

  it('setScenePresets 覆盖写入整个列表', async () => {
    const { preset } = await fresh()
    preset.addScenePreset('旧场景', makeBg())
    const newPresets = [
      {
        id: 'custom_1',
        name: '自定义场景',
        background: makeBg({ fileName: 'custom.jpg' }),
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]
    preset.setScenePresets(newPresets)
    const all = preset.getScenePresets()
    expect(all.length).toBe(1)
    expect(all[0].name).toBe('自定义场景')
  })

  it('场景预设跨模块持久化', async () => {
    const { preset } = await fresh()
    preset.addScenePreset('持久化测试', makeBg({ fileName: 'persist.jpg' }))

    const { preset: preset2 } = await fresh()
    const all = preset2.getScenePresets()
    expect(all.length).toBe(1)
    expect(all[0].name).toBe('持久化测试')
  })
})