// ============================================================
// 房间管理器 · 纯函数与类型常量测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { ROOM_CONFIG_STORAGE_KEY } from '../types'
import type { RoomConfig } from '../types'

// ---- 纯函数等价逻辑（与 room-manager/index.ts 内部实现一致） ----

/** 为每个房间生成默认配置 */
function defaultConfig(roomId: string): RoomConfig {
  return {
    roomId,
    visible: true,
    customName: null,
    customIcon: null,
    customColor: null,
    order: 0,
  }
}

// ---- 测试 ----

describe('ROOM_CONFIG_STORAGE_KEY', () => {
  it('使用 hf: 前缀命名空间', () => {
    expect(ROOM_CONFIG_STORAGE_KEY).toBe('hf:room_configs')
  })
})

describe('defaultConfig', () => {
  it('roomId 与参数一致', () => {
    const cfg = defaultConfig('study')
    expect(cfg.roomId).toBe('study')
  })

  it('默认 visible 为 true', () => {
    const cfg = defaultConfig('any')
    expect(cfg.visible).toBe(true)
  })

  it('默认 customName 为 null', () => {
    const cfg = defaultConfig('any')
    expect(cfg.customName).toBeNull()
  })

  it('默认 customIcon 为 null', () => {
    const cfg = defaultConfig('any')
    expect(cfg.customIcon).toBeNull()
  })

  it('默认 customColor 为 null', () => {
    const cfg = defaultConfig('any')
    expect(cfg.customColor).toBeNull()
  })

  it('默认 order 为 0', () => {
    const cfg = defaultConfig('any')
    expect(cfg.order).toBe(0)
  })

  it('不同 roomId 产生独立配置', () => {
    const a = defaultConfig('study')
    const b = defaultConfig('kitchen')
    expect(a.roomId).toBe('study')
    expect(b.roomId).toBe('kitchen')
    expect(a).not.toBe(b)
  })
})

describe('RoomConfig 类型', () => {
  it('完整配置对象符合接口', () => {
    const cfg: RoomConfig = {
      roomId: 'study',
      visible: false,
      customName: '自习室',
      customIcon: '📖',
      customColor: '#8b7d6b',
      order: 3,
    }
    expect(cfg.roomId).toBe('study')
    expect(cfg.visible).toBe(false)
    expect(cfg.customName).toBe('自习室')
    expect(cfg.customIcon).toBe('📖')
    expect(cfg.customColor).toBe('#8b7d6b')
    expect(cfg.order).toBe(3)
  })

  it('order 排序权重影响排序', () => {
    const configs: RoomConfig[] = [
      defaultConfig('a'),
      defaultConfig('b'),
      defaultConfig('c'),
    ]
    configs[0].order = 3
    configs[1].order = 1
    configs[2].order = 2

    const sorted = [...configs].sort((a, b) => a.order - b.order)
    expect(sorted[0].roomId).toBe('b')
    expect(sorted[1].roomId).toBe('c')
    expect(sorted[2].roomId).toBe('a')
  })
})