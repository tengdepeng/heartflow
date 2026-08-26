// ============================================================
// 家 · 内部房间定义测试
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  HOME_ROOMS,
  DEFAULT_HOME_ROOM,
  getHomeRoom,
} from '../rooms'

describe('HOME_ROOMS', () => {
  it('包含 11 个房间', () => {
    expect(HOME_ROOMS.length).toBe(11)
  })

  it('所有房间 id 唯一', () => {
    const ids = HOME_ROOMS.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有房间都有必要字段', () => {
    for (const room of HOME_ROOMS) {
      expect(room.id).toBeTruthy()
      expect(room.name).toBeTruthy()
      expect(room.icon).toBeTruthy()
      expect(room.description).toBeTruthy()
      expect(room.color).toBeTruthy()
      expect(room.atmosphereColor).toBeTruthy()
      expect(room.atmosphereEndColor).toBeTruthy()
      expect(room.texture).toBeTruthy()
      expect(room.ambientSound).toBeTruthy()
      expect(typeof room.hasInteractive).toBe('boolean')
    }
  })
})

describe('DEFAULT_HOME_ROOM', () => {
  it('是 HOME_ROOMS 的第一项', () => {
    expect(DEFAULT_HOME_ROOM).toBe(HOME_ROOMS[0])
  })

  it('是玄关', () => {
    expect(DEFAULT_HOME_ROOM.id).toBe('entrance')
  })
})

describe('getHomeRoom', () => {
  it('通过 id 查找存在的房间', () => {
    const room = getHomeRoom('study')
    expect(room).toBeDefined()
    expect(room!.name).toBe('书房')
    expect(room!.texture).toBe('wood')
  })

  it('不存在的 id 返回 undefined', () => {
    expect(getHomeRoom('non-existent')).toBeUndefined()
  })

  it('查找所有 11 个房间均能命中', () => {
    for (const room of HOME_ROOMS) {
      expect(getHomeRoom(room.id)).toBe(room)
    }
  })
})