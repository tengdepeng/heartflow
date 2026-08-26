// ============================================================
// useRoomScent · 房间气味维度数据层与逻辑测试
// 覆盖：默认映射 / 启用开关 / 自定义覆盖 / 循环切换 / 重置回落
// 严守宪法：偏好仅存本地 storage（hf:scene:scent_prefs），零云端
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

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useRoomScent } from '../scent'
import { useRoomAtmosphere } from '@/composables/useRoomAtmosphere'

function setScene(id: string) {
  useRoomAtmosphere().currentSceneId.value = id
}

describe('useRoomScent 房间气味维度', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach(k => delete store[k])
    setScene('study')
    useRoomScent().load()
  })

  it('默认启用且书房映射到旧书纸香', () => {
    const m = useRoomScent()
    expect(m.enabled.value).toBe(true)
    expect(m.currentScent.value?.id).toBe('old-book')
  })

  it('未启用时 currentScent 为 null（沉默默认内联展示）', () => {
    const m = useRoomScent()
    m.setEnabled(false)
    expect(m.currentScent.value).toBeNull()
  })

  it('自定义覆盖某房间气味并持久化', () => {
    const m = useRoomScent()
    m.setSceneScent('study', 'mint')
    expect(m.currentScent.value?.id).toBe('mint')
    expect(mockSetKV).toHaveBeenCalledWith(
      'hf:scene:scent_prefs',
      expect.objectContaining({ customScents: expect.objectContaining({ study: 'mint' }) }),
    )
  })

  it('resetSceneScent 清除自定义回落默认映射', () => {
    const m = useRoomScent()
    m.setSceneScent('study', 'mint')
    m.resetSceneScent('study')
    expect(m.currentScent.value?.id).toBe('old-book')
  })

  it('cycleSceneScent 在当前房间循环切换气味', () => {
    setScene('bath') // 默认薄荷清凉
    const m = useRoomScent()
    const before = m.currentScent.value?.id
    m.cycleSceneScent()
    expect(m.currentScent.value?.id).not.toBe(before)
  })

  it('未知房间无默认映射时 currentScent 为 null（允许未定义）', () => {
    setScene('nonexistent-room')
    const m = useRoomScent()
    expect(m.currentScent.value).toBeNull()
  })
})
