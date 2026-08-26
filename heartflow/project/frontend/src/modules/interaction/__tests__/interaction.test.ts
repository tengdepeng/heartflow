// ============================================================
// useInteractionConfigs 模块测试
// 交互配置数据层：配置集的载入 / 保存
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

import { useInteractionConfigs } from '../interaction'
import type { InteractionConfig } from '../../customization/interaction-engine'

const KEY = 'hf:interaction_configs'

function sampleConfig(id = 'cfg1'): InteractionConfig {
  return {
    id,
    name: '默认配置',
    description: '',
    rules: [],
    active: false,
    settings: {
      gestureEnabled: true,
      soundEnabled: true,
      animationEnabled: true,
      hapticEnabled: false,
      animationSpeed: 1.0,
      doubleTapDelay: 300,
      longPressDuration: 500,
    },
    createdAt: '',
    updatedAt: '',
  } as InteractionConfig
}

describe('useInteractionConfigs 交互配置数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例
    useInteractionConfigs().load()
  })

  it('load 从存储读取配置集', () => {
    store[KEY] = [sampleConfig()]
    const m = useInteractionConfigs()
    m.load()
    expect(m.configs.value.length).toBe(1)
    expect(m.configs.value[0].name).toBe('默认配置')
    expect(mockGetKV).toHaveBeenCalledWith(KEY, [])
  })

  it('save 持久化配置集', () => {
    const m = useInteractionConfigs()
    m.configs.value = [sampleConfig('a'), sampleConfig('b')]
    m.save()
    expect(mockSetKV).toHaveBeenCalledWith(KEY, expect.arrayContaining([expect.objectContaining({ id: 'a' })]))
  })

  it('空存储时返回默认空列表', () => {
    const m = useInteractionConfigs()
    m.load()
    expect(m.configs.value).toEqual([])
  })
})
