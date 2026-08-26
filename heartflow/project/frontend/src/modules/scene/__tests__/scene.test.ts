// ============================================================
// useScenes 模块测试
// 场景编辑器数据层：场景预设的载入 / 保存
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useScenes } from '../scene'
import type { ScenePreset } from '../scene'

const KEY = 'hf:scene_presets'

function sampleScene(id = 's1'): ScenePreset {
  return {
    id,
    name: '清晨',
    description: '柔和晨光',
    atmosphereColor: '#f0c040',
    transition: 'fade',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  }
}

describe('useScenes 场景数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例
    useScenes().load()
  })

  it('load 从存储读取场景列表', () => {
    store[KEY] = [sampleScene(), sampleScene('s2')]
    const m = useScenes()
    m.load()
    expect(m.scenes.value.length).toBe(2)
    expect(m.scenes.value[0].name).toBe('清晨')
    expect(mockGetKV).toHaveBeenCalledWith(KEY, [])
  })

  it('save 持久化场景列表', () => {
    const m = useScenes()
    m.scenes.value = [sampleScene('a'), sampleScene('b')]
    m.save()
    expect(mockSetKV).toHaveBeenCalledWith(KEY, expect.arrayContaining([expect.objectContaining({ id: 'a' })]))
  })

  it('空存储时返回默认空列表', () => {
    const m = useScenes()
    m.load()
    expect(m.scenes.value).toEqual([])
  })
})
